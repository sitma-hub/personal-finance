import { Insight, InsightMetricsContext } from '../types';

/**
 * Pure, deterministic insight rules. Each rule maps a metrics context to zero
 * or one Insight. They contain no I/O so they are trivially unit-testable and
 * also serve as the structured input for the optional LLM analysis layer.
 */

const fmtMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const fmtPercent = (value: number): string => `${value.toFixed(1)}%`;

type Rule = (ctx: InsightMetricsContext) => Insight | null;

const emergencyFundRule: Rule = (ctx) => {
  if (ctx.monthlyExpenses <= 0 || ctx.emergencyRunwayMonths == null) return null;
  const months = ctx.emergencyRunwayMonths;
  const metrics = [
    { label: 'Liquid assets', value: fmtMoney(ctx.liquidAssets) },
    { label: 'Monthly expenses', value: fmtMoney(ctx.monthlyExpenses) },
    { label: 'Runway', value: `${months.toFixed(1)} months` },
  ];

  if (months < 3) {
    return {
      id: 'emergency-fund-low',
      severity: 'critical',
      title: 'Emergency fund below 3 months',
      detail: `Your liquid savings cover about ${months.toFixed(1)} months of expenses. Aim for at least 3-6 months as a safety buffer.`,
      metrics,
    };
  }
  if (months < 6) {
    return {
      id: 'emergency-fund-building',
      severity: 'warning',
      title: 'Emergency fund building up',
      detail: `You have roughly ${months.toFixed(1)} months of expenses in liquid savings. A 6-month buffer is a common target.`,
      metrics,
    };
  }
  return {
    id: 'emergency-fund-healthy',
    severity: 'positive',
    title: 'Healthy emergency fund',
    detail: `Your liquid savings cover about ${months.toFixed(1)} months of expenses — a solid safety buffer.`,
    metrics,
  };
};

const savingsRateRule: Rule = (ctx) => {
  if (ctx.monthlyIncome <= 0) return null;
  const rate = ctx.savingsRate;
  const wb = ctx.wealthBuilding;
  const metrics = [
    { label: 'Monthly income', value: fmtMoney(ctx.monthlyIncome) },
    { label: 'Wealth building / month', value: fmtMoney(wb.total) },
    { label: 'Savings rate', value: fmtPercent(rate) },
    { label: 'Investments', value: fmtMoney(wb.assetContributions) },
    { label: 'Debt principal', value: fmtMoney(wb.debtPrincipal) },
    { label: 'Special repayments', value: fmtMoney(wb.specialRepayments) },
  ];

  if (ctx.monthlySavings < 0) {
    return {
      id: 'savings-rate-negative',
      severity: 'critical',
      title: 'Cash flow deficit',
      detail: `Your planned cash outflows exceed income by ${fmtMoney(Math.abs(ctx.monthlySavings))} per month (includes interest). Wealth-building rate is ${fmtPercent(rate)} — review spending or increase income.`,
      metrics,
    };
  }
  if (rate <= 0) {
    return {
      id: 'savings-rate-zero',
      severity: 'warning',
      title: 'No wealth building',
      detail: 'No planned investments, debt principal, or special repayments are configured. Add contributions or debt payments that build net worth.',
      metrics,
    };
  }
  if (rate < 10) {
    return {
      id: 'savings-rate-low',
      severity: 'warning',
      title: 'Low savings rate',
      detail: `You're saving about ${fmtPercent(rate)} of income. Increasing this toward 20% accelerates your goals.`,
      metrics,
    };
  }
  if (rate < 20) {
    return {
      id: 'savings-rate-moderate',
      severity: 'info',
      title: 'Moderate savings rate',
      detail: `You're saving about ${fmtPercent(rate)} of income. Solid — pushing past 20% would compound faster.`,
      metrics,
    };
  }
  return {
    id: 'savings-rate-strong',
    severity: 'positive',
    title: 'Strong savings rate',
    detail: `You're saving about ${fmtPercent(rate)} of income. Excellent momentum toward your goals.`,
    metrics,
  };
};

const allocationConcentrationRule: Rule = (ctx) => {
  if (!ctx.topAllocation || ctx.totalAssets <= 0) return null;
  const { type, percentage } = ctx.topAllocation;
  const readableType = type.replace(/_/g, ' ');
  if (percentage >= 70) {
    return {
      id: 'allocation-concentrated',
      severity: 'warning',
      title: 'Concentrated asset allocation',
      detail: `${fmtPercent(percentage)} of your assets sit in ${readableType}. Consider whether diversification fits your goals and risk tolerance.`,
      metrics: [{ label: 'Largest allocation', value: `${readableType} (${fmtPercent(percentage)})` }],
    };
  }
  return null;
};

const highInterestDebtRule: Rule = (ctx) => {
  if (ctx.highInterestDebts.length === 0) return null;
  const worst = [...ctx.highInterestDebts].sort((a, b) => b.interestRate - a.interestRate)[0]!;
  return {
    id: 'high-interest-debt',
    severity: 'warning',
    title: 'High-interest debt detected',
    detail: `${worst.name} carries an interest rate of ${fmtPercent(worst.interestRate * 100)}. Prioritising extra payments on high-interest debt usually beats investing the same money.`,
    metrics: ctx.highInterestDebts.map((d) => ({
      label: d.name,
      value: `${fmtPercent(d.interestRate * 100)} on ${fmtMoney(d.balance)}`,
    })),
  };
};

const actualVsPlannedRule: Rule = (ctx) => {
  if (!ctx.actual || ctx.actual.spending <= 0) return null;
  const { spending, savingsInvestments, plannedExpenses, month } = ctx.actual;
  if (plannedExpenses <= 0) return null;

  const ratio = spending / plannedExpenses;
  const metrics = [
    { label: 'Actual spending', value: fmtMoney(spending) },
    { label: 'Planned spending', value: fmtMoney(plannedExpenses) },
  ];
  // Make the exclusion explicit so investments don't look like missing money.
  if (savingsInvestments > 0) {
    metrics.push({ label: 'Investments (excluded)', value: fmtMoney(savingsInvestments) });
  }

  if (ratio > 1.1) {
    return {
      id: 'overspending-vs-plan',
      severity: 'warning',
      title: 'Spending above plan this month',
      detail: `Recorded spending for ${month} is ${fmtMoney(spending)}, about ${fmtPercent((ratio - 1) * 100)} over your planned ${fmtMoney(plannedExpenses)}. Debt payments count at full amount; investment transfers are excluded.`,
      metrics,
    };
  }
  if (ratio < 0.9) {
    return {
      id: 'underspending-vs-plan',
      severity: 'positive',
      title: 'Spending below plan this month',
      detail: `Recorded spending for ${month} is ${fmtMoney(spending)}, under your planned ${fmtMoney(plannedExpenses)}. Debt payments count at full amount; investment transfers are excluded.`,
      metrics,
    };
  }
  return null;
};

const snapshotGapRule: Rule = (ctx) => {
  if (ctx.snapshotCount === 0) {
    return {
      id: 'no-snapshots',
      severity: 'info',
      title: 'No snapshots recorded yet',
      detail: 'Save a monthly net-worth snapshot to start tracking your progress over time.',
    };
  }
  if (ctx.monthsSinceLastSnapshot != null && ctx.monthsSinceLastSnapshot >= 2) {
    return {
      id: 'snapshot-gap',
      severity: 'info',
      title: 'Snapshot history is out of date',
      detail: `It's been about ${ctx.monthsSinceLastSnapshot} months since your last snapshot. A monthly check-in keeps your trend accurate.`,
    };
  }
  return null;
};

const netWorthTrendRule: Rule = (ctx) => {
  if (!ctx.netWorthChange) return null;
  const { absolute, percent, months } = ctx.netWorthChange;
  if (months < 1) return null;
  const metrics = [
    { label: 'Change', value: fmtMoney(absolute) },
    ...(percent != null ? [{ label: 'Percent', value: fmtPercent(percent) }] : []),
    { label: 'Over', value: `${months} months` },
  ];

  if (absolute > 0) {
    return {
      id: 'net-worth-growing',
      severity: 'positive',
      title: 'Net worth is growing',
      detail: `Your net worth rose by ${fmtMoney(absolute)} over the last ${months} months. Keep it up.`,
      metrics,
    };
  }
  if (absolute < 0) {
    return {
      id: 'net-worth-declining',
      severity: 'warning',
      title: 'Net worth is declining',
      detail: `Your net worth fell by ${fmtMoney(Math.abs(absolute))} over the last ${months} months. Review recent spending and asset values.`,
      metrics,
    };
  }
  return null;
};

const RULES: Rule[] = [
  emergencyFundRule,
  savingsRateRule,
  allocationConcentrationRule,
  highInterestDebtRule,
  actualVsPlannedRule,
  netWorthTrendRule,
  snapshotGapRule,
];

const SEVERITY_ORDER: Record<Insight['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
  positive: 3,
};

/** Run all rules against the context and return insights sorted by severity. */
export function runInsightRules(ctx: InsightMetricsContext): Insight[] {
  const insights = RULES.map((rule) => rule(ctx)).filter((i): i is Insight => i !== null);
  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
