import {
  InsightMetricsContext,
  FinancialDatasets,
  Asset,
  Liability,
  IncomeStream,
  Expense,
  NetWorthSnapshot,
  Transaction,
} from '../types';
import {
  getLiabilityMonthlyInterest,
  getLiabilityPrincipalFromRegularPayment,
} from '../utils/wealthBuilding';
import {
  getLiabilityBaseMonthlyPayment,
  getLiabilitySpecialRepaymentMonthly,
} from '../utils/liabilityCashFlow';

/**
 * Thin client for a local Ollama instance. The LLM layer is entirely optional:
 * when disabled or unreachable, callers get a clear status rather than an error.
 * All data stays on-device — we only talk to the configured local Ollama URL.
 */

const fmtMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const fmtMoney2 = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value);

const fmtPercent = (value: number): string => `${value.toFixed(1)}%`;

const num = (value: unknown): number => parseFloat(String(value ?? 0)) || 0;

/** Render a Date | string into a YYYY-MM-DD (or YYYY-MM) string for prompts. */
const toDateStr = (value: unknown, monthOnly = false): string => {
  if (!value) return '';
  const s = typeof value === 'string' ? value : new Date(value as string).toISOString();
  return monthOnly ? s.substring(0, 7) : s.substring(0, 10);
};

/** Cap the number of transaction rows embedded in the prompt to keep it bounded. */
const MAX_PROMPT_TRANSACTIONS = 1000;

export type LlmProcessor = 'gpu' | 'cpu' | 'partial' | null;

export interface LlmStatus {
  enabled: boolean;
  available: boolean;
  model: string;
  /** How the model is currently loaded: gpu / cpu / partial, or null when not loaded yet. */
  processor: LlmProcessor;
  /** Percentage of the model offloaded to GPU VRAM (0-100), when loaded. */
  gpuPercent: number | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class LlmService {
  private readonly enabled = process.env['LLM_ENABLED'] === 'true';
  private readonly baseUrl = process.env['OLLAMA_URL'] || 'http://ollama:11434';
  private readonly model = process.env['OLLAMA_MODEL'] || 'llama3.2:3b';
  // Larger context so the full record dump actually fits. Ollama defaults to
  // 2048, which would truncate the data; bump it (override via OLLAMA_NUM_CTX).
  private readonly numCtx = parseInt(process.env['OLLAMA_NUM_CTX'] || '8192', 10);

  isEnabled(): boolean {
    return this.enabled;
  }

  getModel(): string {
    return this.model;
  }

  /** Check whether Ollama is reachable and the configured model is pulled. */
  async getStatus(): Promise<LlmStatus> {
    if (!this.enabled) {
      return { enabled: false, available: false, model: this.model, processor: null, gpuPercent: null };
    }
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/tags`, { method: 'GET' }, 4000);
      if (!res.ok) {
        return { enabled: true, available: false, model: this.model, processor: null, gpuPercent: null };
      }
      const body = (await res.json()) as { models?: { name?: string }[] };
      const names = (body.models ?? []).map((m) => m.name ?? '');
      // Match exact or family (e.g. "llama3.2:3b" matches "llama3.2:3b" or "llama3.2:3b-instruct")
      const available = names.some((n) => n === this.model || n.startsWith(this.model.split(':')[0] ?? this.model));
      const { processor, gpuPercent } = available
        ? await this.getRunningPlacement()
        : { processor: null, gpuPercent: null };
      return { enabled: true, available, model: this.model, processor, gpuPercent };
    } catch {
      return { enabled: true, available: false, model: this.model, processor: null, gpuPercent: null };
    }
  }

  /**
   * Inspect currently-loaded models (Ollama `/api/ps`) to report whether the
   * configured model is running on GPU, CPU, or a split. Returns null processor
   * when the model is not currently loaded (it loads on first generation).
   */
  private async getRunningPlacement(): Promise<{ processor: LlmProcessor; gpuPercent: number | null }> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/ps`, { method: 'GET' }, 4000);
      if (!res.ok) return { processor: null, gpuPercent: null };
      const body = (await res.json()) as {
        models?: { name?: string; size?: number; size_vram?: number }[];
      };
      const family = this.model.split(':')[0] ?? this.model;
      const running = (body.models ?? []).find(
        (m) => m.name === this.model || (m.name ?? '').startsWith(family)
      );
      if (!running) return { processor: null, gpuPercent: null };

      const size = running.size ?? 0;
      const vram = running.size_vram ?? 0;
      const gpuPercent = size > 0 ? Math.round((vram / size) * 100) : null;

      if (vram <= 0) return { processor: 'cpu', gpuPercent: 0 };
      if (size > 0 && vram >= size) return { processor: 'gpu', gpuPercent: 100 };
      return { processor: 'partial', gpuPercent };
    } catch {
      return { processor: null, gpuPercent: null };
    }
  }

  /**
   * Generate a natural-language analysis grounded in the supplied metrics.
   * Throws only on unexpected errors; disabled/unavailable states are conveyed
   * through the returned object.
   */
  async generateAnalysis(
    metrics: InsightMetricsContext,
    datasets?: FinancialDatasets
  ): Promise<{ enabled: boolean; model: string; analysis: string }> {
    if (!this.enabled) {
      return { enabled: false, model: this.model, analysis: '' };
    }

    const prompt = `${this.buildSystemPrompt(metrics, datasets)}\n\nWrite a concise overall analysis now in markdown: cover the overall position, strengths, risks, and 2-4 concrete suggestions.`;

    const res = await this.fetchWithTimeout(
      `${this.baseUrl}/api/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: { temperature: 0.3, num_ctx: this.numCtx },
        }),
      },
      110000
    );

    if (!res.ok) {
      throw new Error(`Ollama request failed with status ${res.status}`);
    }

    const body = (await res.json()) as { response?: string };
    const analysis = (body.response ?? '').trim();
    return { enabled: true, model: this.model, analysis };
  }

  /**
   * Conversational follow-up. Accepts the prior turns and returns the next
   * assistant reply, grounded in the same metrics via a system message.
   */
  async chat(
    messages: ChatMessage[],
    metrics: InsightMetricsContext,
    datasets?: FinancialDatasets
  ): Promise<{ enabled: boolean; model: string; reply: string }> {
    if (!this.enabled) {
      return { enabled: false, model: this.model, reply: '' };
    }

    const system = this.buildSystemPrompt(metrics, datasets);
    const res = await this.fetchWithTimeout(
      `${this.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'system', content: system }, ...messages],
          stream: false,
          options: { temperature: 0.3, num_ctx: this.numCtx },
        }),
      },
      110000
    );

    if (!res.ok) {
      throw new Error(`Ollama request failed with status ${res.status}`);
    }

    const body = (await res.json()) as { message?: { content?: string } };
    const reply = (body.message?.content ?? '').trim();
    return { enabled: true, model: this.model, reply };
  }

  private buildMetricsSummary(m: InsightMetricsContext): string[] {
    const lines: string[] = [];
    lines.push(`Net worth: ${fmtMoney(m.netWorth)} (assets ${fmtMoney(m.totalAssets)}, liabilities ${fmtMoney(m.totalLiabilities)})`);
    const wb = m.wealthBuilding;
    lines.push(
      `Planned cash flow (budget/plan): income ${fmtMoney(m.monthlyIncome)}; ` +
        `expenses ${fmtMoney(m.monthlyExpenses)} = regular ${fmtMoney(m.regularExpenses)} + debt payments ${fmtMoney(m.totalDebtMonthlyPayments)}; ` +
        `cash-flow surplus ${fmtMoney(m.monthlySavings)} (${fmtPercent(m.cashFlowSavingsRate)})`
    );
    lines.push(
      `Planned savings rate (wealth building): ${fmtPercent(m.savingsRate)} = ` +
        `(${fmtMoney(wb.assetContributions)} investments + ${fmtMoney(wb.debtPrincipal)} debt principal + ${fmtMoney(wb.specialRepayments)} special repayments) / ${fmtMoney(m.monthlyIncome)}`
    );
    lines.push(`Liquid assets: ${fmtMoney(m.liquidAssets)}${m.emergencyRunwayMonths != null ? `; emergency runway ${m.emergencyRunwayMonths.toFixed(1)} months` : ''}`);
    if (m.topAllocation) {
      lines.push(`Largest asset allocation: ${m.topAllocation.type.replace(/_/g, ' ')} at ${fmtPercent(m.topAllocation.percentage)}`);
    }
    if (m.highInterestDebts.length > 0) {
      lines.push(`High-interest debts: ${m.highInterestDebts.map((d) => `${d.name} (${fmtPercent(d.interestRate * 100)} on ${fmtMoney(d.balance)})`).join('; ')}`);
    }
    if (m.netWorthChange) {
      lines.push(`Net worth changed by ${fmtMoney(m.netWorthChange.absolute)} over ${m.netWorthChange.months} months`);
    }
    if (m.actual) {
      const actualRate =
        m.actual.savingsRate != null ? fmtPercent(m.actual.savingsRate) : 'n/a';
      lines.push(
        `Actual cash flow from transactions (${m.actual.month}): inflow ${fmtMoney(m.actual.inflow)}; ` +
          `outflow ${fmtMoney(m.actual.outflow)}; net ${fmtMoney(m.actual.net)} → actual savings rate ${actualRate}`
      );
      lines.push(
        `Compare to plan for ${m.actual.month}: planned income ${fmtMoney(m.actual.plannedIncome)}; planned expenses ${fmtMoney(m.actual.plannedExpenses)}`
      );
      if (m.actual.topCategory) {
        lines.push(`Largest spending category this month: ${m.actual.topCategory.category} (${fmtMoney(m.actual.topCategory.total)})`);
      }
    }
    return lines;
  }

  /**
   * Pre-answered standard metrics at the top of the prompt so small models do not
   * re-derive them from the wrong tables (income streams, recurring expenses).
   */
  private buildCanonicalAnswers(m: InsightMetricsContext): string[] {
    const wb = m.wealthBuilding;
    const lines: string[] = [
      '## CANONICAL ANSWERS — use verbatim for Sparquote / savings rate; do NOT recalculate from one table only',
      '',
      `- **Sparquote / savings rate** (primary, from income_streams + assets + liabilities): **${fmtPercent(m.savingsRate)}**`,
      `  - Wealth building ${fmtMoney(wb.total)}/month = ${fmtMoney(wb.assetContributions)} investments + ${fmtMoney(wb.debtPrincipal)} debt principal + ${fmtMoney(wb.specialRepayments)} special repayments`,
      `  - Divided by planned income ${fmtMoney(m.monthlyIncome)} (from ### Income streams, not transactions)`,
      `  - Answer "was ist meine Sparquote?" / "tatsächliche Sparquote?" with THIS figure and explain the three components.`,
      `  - Sources: ### Assets (monthly_contribution), ### Liabilities (payment, rate, special_repayment_*), ### Income streams — NOT ### Transactions.`,
      `- **Cash-flow surplus** (separate metric): ${fmtPercent(m.cashFlowSavingsRate)} — uses ### Recurring expenses + full ### Liabilities payments; includes interest as cost.`,
    ];

    if (m.actual && m.actual.inflow > 0) {
      const { month, inflow, outflow, net, savingsRate } = m.actual;
      const txRate = savingsRate != null ? fmtPercent(savingsRate) : 'n/a';
      lines.push(
        `- **Transaction ledger** (${month}, ### Transactions only — supplementary): inflow ${fmtMoney(inflow)}, outflow ${fmtMoney(outflow)}, net ${fmtMoney(net)}, cash-flow rate ${txRate}`,
        `  - Mention only as "what hit the bank this month" — it is NOT the app savings rate and cannot split Tilgung vs Zinsen.`,
        `  - Compare to plan if useful; do not replace the wealth-building Sparquote above.`
      );
    } else {
      lines.push(
        '- **Transaction ledger**: no (or incomplete) transaction data this month — Sparquote still comes from assets/liabilities/income tables above.'
      );
    }

    lines.push(
      '',
      '**FORBIDDEN for Sparquote / savings rate questions:**',
      '- Do NOT answer using only ### Transactions or only ### Recurring expenses.',
      '- Do NOT sum "essential" expenses or omit mortgage/debt.',
      '- Do NOT invent Sonderzahlungen — use ### Liabilities fields only.',
      '- Do NOT substitute transaction cash-flow rate for the wealth-building Sparquote.'
    );

    return lines;
  }

  /** Tell the model which database section to use for each question type. */
  private buildDataSourceGuide(): string[] {
    return [
      '## Data sources — use ALL relevant tables, not just transactions',
      '',
      '| Question | Primary tables | Notes |',
      '|----------|----------------|-------|',
      '| Savings rate / Sparquote | Income streams, Assets, Liabilities | Precomputed in CANONICAL ANSWERS |',
      '| Income / salary | Income streams | Not transaction inflows unless user asks for bank actuals |',
      '| Investments / contributions | Assets (`monthly_contribution`) | Not recurring expenses |',
      '| Mortgage / debt / Tilgung / Sonderzahlung | Liabilities | principal = payment − interest; see wealth-building breakdown |',
      '| Budget / planned spending | Recurring expenses + Liabilities payments | Cash-flow & emergency fund |',
      '| Net worth trend | Snapshots, Assets, Liabilities | |',
      '| What did I spend in May? / categories | Transactions | Filter by date & category |',
      '| Actual bank cash flow this month | Transactions | Optional comparison to plan |',
      '',
      'Default: combine structured plan data (assets, liabilities, income, expenses) with transactions when both matter. Never ignore liabilities or assets for savings-rate questions.',
    ];
  }

  /** Per-record breakdown backing the wealth-building savings rate. */
  private buildWealthBuildingBreakdown(d: FinancialDatasets, m: InsightMetricsContext): string[] {
    const lines: string[] = [
      '## Wealth-building breakdown (how Sparquote is built from the database)',
      '',
      '### Income (denominator)',
      `Total planned monthly income: ${fmtMoney(m.monthlyIncome)} — sum of ### Income streams below.`,
      '',
      '### Investments (numerator — from Assets)',
    ];

    const contributingAssets = d.assets.filter((a) => num(a.monthly_contribution) > 0);
    if (contributingAssets.length === 0) {
      lines.push('- (no asset contributions configured)');
    } else {
      contributingAssets.forEach((a) => {
        lines.push(`- ${a.name}: ${fmtMoney(num(a.monthly_contribution))}/month`);
      });
    }

    lines.push('', '### Debt principal (numerator — from Liabilities, payment minus interest)');
    d.liabilities.forEach((l) => {
      const base = getLiabilityBaseMonthlyPayment(l);
      const interest = getLiabilityMonthlyInterest(l);
      const principal = getLiabilityPrincipalFromRegularPayment(l);
      if (base <= 0 && !l.special_repayment_enabled) return;
      lines.push(
        `- ${l.name}: payment ${fmtMoney(base)}, est. interest ${fmtMoney(interest)}, principal ${fmtMoney(principal)}`
      );
    });
    if (d.liabilities.length === 0) {
      lines.push('- (no liabilities)');
    }

    lines.push('', '### Special repayments (numerator — from Liabilities Sonderzahlung fields)');
    let hasSpecial = false;
    d.liabilities.forEach((l) => {
      const special = getLiabilitySpecialRepaymentMonthly(l);
      if (special <= 0) return;
      hasSpecial = true;
      lines.push(
        `- ${l.name}: ${fmtMoney(special)}/month equivalent` +
          (l.special_repayment_amount != null
            ? ` (${fmtMoney(num(l.special_repayment_amount))} ${l.special_repayment_frequency ?? 'monthly'})`
            : '')
      );
    });
    if (!hasSpecial) {
      lines.push('- (none configured)');
    }

    const wb = m.wealthBuilding;
    lines.push(
      '',
      `**Total:** ${fmtMoney(wb.total)}/month → **${fmtPercent(m.savingsRate)}** of ${fmtMoney(m.monthlyIncome)}`
    );

    return lines;
  }

  /** Rules so the model does not double-count debt or invent Sonderzahlungen. */
  private buildAccountingGuidance(): string[] {
    return [
      '## How to answer savings-rate questions (critical)',
      '',
      'Savings rate definition in this app (wealth building):',
      '- **Savings rate** = (asset contributions + debt principal + special repayments) / monthly income.',
      '- Debt **principal** = monthly payment − estimated monthly interest (balance × annual rate / 12).',
      '- **Special repayments** = configured Sonderzahlungen (monthly-normalized).',
      '- This is NOT the same as cash-flow surplus (income − all expenses). Cash-flow includes interest as cost.',
      '',
      'When asked Sparquote / savings rate / tatsächliche Sparquote:',
      '1. Quote the CANONICAL wealth-building percentage and walk through investments + principal + special repayments.',
      '2. Cite the underlying records from ### Assets and ### Liabilities (and income from ### Income streams).',
      '3. Optionally add ### Transactions only as bank-ledger comparison — never as the savings rate itself.',
      '',
      'Debt / mortgage (Hypothek):',
      '- Principal counts toward savings rate; interest does not.',
      '- Full debt payments (principal + interest + special) remain in planned **expenses** for cash-flow and emergency-fund math.',
      '- NEVER subtract debt payments from expenses a second time.',
      '',
      'Sonderzahlungen (extra mortgage payments):',
      '- Only cite amounts from liability records: `special_repayment_enabled`, `special_repayment_amount`, `special_repayment_frequency`.',
      '- If special repayment is disabled or amount is missing, say it is not configured — do NOT invent amounts (e.g. 500 EUR).',
      '- Annual/quarterly Sonderzahlungen are normalized to a monthly equivalent in `totalDebtMonthlyPayments`.',
      '',
      'Asset contributions (`monthly_contribution` on assets):',
      '- These are separate from the expense total; they are additional planned wealth-building cash outflows if the user funds them.',
      '- Paying down debt and contributing to assets are different levers; explain both when asked what "counts" toward building wealth.',
      '',
      'When the user challenges your math, re-read the numbers in the data and correct yourself explicitly.',
    ];
  }

  private buildSystemPrompt(m: InsightMetricsContext, datasets?: FinancialDatasets): string {
    const lines: string[] = [
      "You are a cautious personal-finance assistant helping a single user understand their finances.",
      'You have read-only access to the full database: assets, liabilities, income streams, recurring expenses,',
      'net-worth snapshots, and transactions. Use every relevant table — transactions alone are never sufficient.',
      'Rules:',
      '- Base every statement strictly on the data provided. Do not invent figures.',
      '- Cross-check multiple sections (see Data sources). For Sparquote, always use income + assets + liabilities.',
      '- Use ### Transactions for bank-ledger questions (dates, categories, monthly totals).',
      '- Use ### Assets / ### Liabilities / ### Income streams for plan, debt, contributions, and savings rate.',
      '- If the data does not contain the answer, say so plainly.',
      '- Be concise and practical. Use markdown (short bold headers and bullet points) when helpful.',
      '- Do not give regulated investment advice; frame suggestions as general guidance.',
      '- All amounts are in EUR.',
      '- Reply in the same language the user writes in (German or English).',
      '',
      ...this.buildCanonicalAnswers(m),
      '',
      ...this.buildDataSourceGuide(),
      '',
      '## Summary metrics',
      ...this.buildMetricsSummary(m).map((l) => `- ${l}`),
      '',
      ...this.buildAccountingGuidance(),
    ];

    if (datasets) {
      lines.push('', ...this.buildWealthBuildingBreakdown(datasets, m));
      lines.push('', ...this.buildDataDetail(datasets));
    }

    return lines.join('\n');
  }

  /**
   * Render the full record sets as compact, line-oriented text so the model can
   * answer detailed questions about specific accounts, debts, expenses, and
   * transactions — not just the aggregated metrics.
   */
  private buildDataDetail(d: FinancialDatasets): string[] {
    const out: string[] = [
      '## Full database records',
      '(Use together with Wealth-building breakdown and Data sources — not transactions alone.)',
    ];

    out.push('', `### Assets (${d.assets.length}) — balances, contributions; drives savings-rate investments`);
    d.assets.forEach((a: Asset) => {
      const parts = [
        `${a.name} [${a.type}]: value ${fmtMoney(num(a.current_value))}`,
        `monthly contribution ${fmtMoney(num(a.monthly_contribution))}`,
      ];
      if (a.expected_annual_return != null) parts.push(`expected return ${fmtPercent(num(a.expected_annual_return))}`);
      if (a.as_of_date) parts.push(`as of ${toDateStr(a.as_of_date)}`);
      if (a.notes) parts.push(`notes: ${a.notes}`);
      out.push(`- ${parts.join(', ')}`);
    });

    out.push('', `### Liabilities (${d.liabilities.length}) — debt, payments, interest, Sonderzahlung; drives principal & special repayments`);
    d.liabilities.forEach((l: Liability) => {
      const parts = [`${l.name} [${l.type}]: balance ${fmtMoney(num(l.current_balance))}`];
      if (l.interest_rate != null) parts.push(`rate ${fmtPercent(num(l.interest_rate))}`);
      if (l.monthly_payment != null) parts.push(`monthly payment ${fmtMoney(num(l.monthly_payment))}`);
      if (l.special_repayment_enabled && l.special_repayment_amount != null) {
        parts.push(
          `special repayment ${fmtMoney(num(l.special_repayment_amount))} ${l.special_repayment_frequency ?? 'monthly'} (included in planned debt payments)`
        );
      } else if (l.special_repayment_enabled) {
        parts.push('special repayment enabled but amount not set');
      }
      if (l.notes) parts.push(`notes: ${l.notes}`);
      out.push(`- ${parts.join(', ')}`);
    });

    out.push('', `### Income streams (${d.incomeStreams.length}) — planned income; savings-rate denominator`);
    d.incomeStreams.forEach((i: IncomeStream) => {
      const parts = [
        `${i.name} [${i.type}]: ${fmtMoney(num(i.current_amount))} ${i.frequency}`,
        `annual growth ${fmtPercent(num(i.annual_growth_rate))}`,
      ];
      if (i.notes) parts.push(`notes: ${i.notes}`);
      out.push(`- ${parts.join(', ')}`);
    });

    out.push(
      '',
      `### Recurring expenses (${d.expenses.length}) — budget/plan cash costs; NOT used for savings rate (use Assets + Liabilities)`
    );
    d.expenses.forEach((e: Expense) => {
      const parts = [
        `${e.name} [${e.category}]: ${fmtMoney(num(e.monthly_amount))}/month`,
        e.is_discretionary ? 'discretionary' : 'essential',
      ];
      if (e.notes) parts.push(`notes: ${e.notes}`);
      out.push(`- ${parts.join(', ')}`);
    });

    out.push('', `### Net-worth snapshots (${d.snapshots.length}) — historical net worth`);
    d.snapshots.forEach((s: NetWorthSnapshot) => {
      out.push(
        `- ${toDateStr(s.snapshot_month, true)}: net worth ${fmtMoney(num(s.net_worth))} ` +
          `(assets ${fmtMoney(num(s.total_assets))}, liabilities ${fmtMoney(num(s.total_liabilities))})`
      );
    });

    const txns = d.transactions.slice(0, MAX_PROMPT_TRANSACTIONS);
    const truncatedNote =
      d.transactions.length > MAX_PROMPT_TRANSACTIONS
        ? ` (showing the ${MAX_PROMPT_TRANSACTIONS} most recent of ${d.transactions.length})`
        : '';
    out.push(
      '',
      `### Transactions${truncatedNote} — bank ledger only; optional for spend/income actuals, NOT for Sparquote`
    );
    out.push('Format: date | direction | amount | category | description');
    txns.forEach((t: Transaction) => {
      const sign = t.direction === 'outflow' ? '-' : '+';
      const desc = t.description ? ` | ${t.description}` : '';
      out.push(`- ${toDateStr(t.txn_date)} | ${t.direction} | ${sign}${fmtMoney2(num(t.amount))} | ${t.category}${desc}`);
    });

    return out;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}
