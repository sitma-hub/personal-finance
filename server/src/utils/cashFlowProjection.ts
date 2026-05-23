import { Expense, IncomeStream, Liability } from '../types';
import { getLiabilityMonthlyPayment, getLiabilityMonthlyRate } from './liabilityCashFlow';
import { simulateLiabilityPayoff } from './payoffInvestProjection';
import { isInvestableForProjection } from './assetProjection';
import { normalizeAnnualRate } from './rateNormalization';
import type { Asset } from '../types';

export interface CashFlowScenarioParams {
  /** 1 = use each stream's annual_growth_rate; 0 = flat income */
  incomeGrowthMultiplier: number;
  /** 1 = use each expense's annual_inflation_rate; >1 = higher inflation (pessimistic) */
  expenseInflationMultiplier: number;
}

export const CASH_FLOW_SCENARIOS = {
  pessimistic: { incomeGrowthMultiplier: 0, expenseInflationMultiplier: 1.35 },
  expected: { incomeGrowthMultiplier: 1, expenseInflationMultiplier: 1 },
  optimistic: { incomeGrowthMultiplier: 1.25, expenseInflationMultiplier: 0.85 },
} as const;

const FLAT_CASH_FLOW_PARAMS: CashFlowScenarioParams = {
  incomeGrowthMultiplier: 0,
  expenseInflationMultiplier: 0,
};

export interface SurplusSeriesOptions {
  /**
   * When payoff redirect extras are applied separately, keep counting redirected
   * liability payments in surplus so freed payments are not double-invested.
   */
  holdRedirectedDebtPayments?: boolean;
}

function incomeToMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'annual':
      return amount / 12;
    case 'hourly':
      return (amount * 40 * 52) / 12;
    case 'monthly':
    default:
      return amount;
  }
}

export function monthlyIncomeAtMonth(
  streams: IncomeStream[],
  monthIndex: number,
  incomeGrowthMultiplier: number
): number {
  return streams.reduce((sum, income) => {
    const base = incomeToMonthly(
      parseFloat(String(income.current_amount)),
      income.frequency
    );
    const growth =
      normalizeAnnualRate(income.annual_growth_rate) * incomeGrowthMultiplier;
    const factor = Math.pow(1 + growth, monthIndex / 12);
    return sum + base * factor;
  }, 0);
}

export function monthlyExpensesAtMonth(
  expenses: Expense[],
  monthIndex: number,
  expenseInflationMultiplier: number
): number {
  return expenses.reduce((sum, expense) => {
    const base = parseFloat(String(expense.monthly_amount));
    const inflation =
      normalizeAnnualRate(expense.annual_inflation_rate) * expenseInflationMultiplier;
    const factor = Math.pow(1 + inflation, monthIndex / 12);
    return sum + base * factor;
  }, 0);
}

/** Total liability payment made in month m (0 if already paid off, unless held for redirect). */
export function liabilityPaymentsAtMonth(
  liabilities: Liability[],
  monthIndex: number,
  options?: SurplusSeriesOptions
): number {
  let total = 0;
  liabilities.forEach((liability) => {
    const payment = getLiabilityMonthlyPayment(liability);
    const sim = simulateLiabilityPayoff(liability, monthIndex + 1);
    const prevBalance =
      monthIndex > 0
        ? (sim.balanceSeries[monthIndex - 1] ?? 0)
        : parseFloat(String(liability.current_balance));

    if (prevBalance <= 0) {
      if (options?.holdRedirectedDebtPayments && liability.invest_after_payoff) {
        total += payment;
      }
      return;
    }

    const rate = getLiabilityMonthlyRate(liability.interest_rate);
    const interest = prevBalance * rate;
    total += Math.min(payment, prevBalance + interest);
  });
  return total;
}

export function buildMonthlySurplusSeries(
  incomeStreams: IncomeStream[],
  expenses: Expense[],
  liabilities: Liability[],
  months: number,
  params: CashFlowScenarioParams,
  options?: SurplusSeriesOptions
): number[] {
  const series: number[] = [];
  for (let m = 0; m < months; m++) {
    const income = monthlyIncomeAtMonth(incomeStreams, m, params.incomeGrowthMultiplier);
    const expense = monthlyExpensesAtMonth(expenses, m, params.expenseInflationMultiplier);
    const debtPay = liabilityPaymentsAtMonth(liabilities, m, options);
    series.push(Math.round((income - expense - debtPay) * 100) / 100);
  }
  return series;
}

/**
 * Extra monthly investing from income growth and expense inflation only.
 * Does not add base surplus (that should already be reflected in asset monthly_contribution).
 */
export function buildGrowthInflationExtraPerMonth(
  incomeStreams: IncomeStream[],
  expenses: Expense[],
  liabilities: Liability[],
  months: number,
  params: CashFlowScenarioParams,
  options?: SurplusSeriesOptions
): number[] {
  const withGrowth = buildMonthlySurplusSeries(
    incomeStreams,
    expenses,
    liabilities,
    months,
    params,
    options
  );
  const flatRates = buildMonthlySurplusSeries(
    incomeStreams,
    expenses,
    liabilities,
    months,
    FLAT_CASH_FLOW_PARAMS,
    options
  );

  return withGrowth.map((s, m) => Math.max(0, s - (flatRates[m] ?? 0)));
}

/**
 * Distributes growth/inflation investing lift across investable assets.
 */
export function buildCashFlowExtraByAsset(
  assets: Asset[],
  incomeStreams: IncomeStream[],
  expenses: Expense[],
  liabilities: Liability[],
  months: number,
  params: CashFlowScenarioParams,
  options?: SurplusSeriesOptions
): Map<string, number[]> {
  const investable = assets.filter(isInvestableForProjection);
  const extras = new Map<string, number[]>();
  if (investable.length === 0) return extras;

  const extraPerMonth = buildGrowthInflationExtraPerMonth(
    incomeStreams,
    expenses,
    liabilities,
    months,
    params,
    options
  );

  const totalContrib = investable.reduce(
    (s, a) => s + parseFloat(String(a.monthly_contribution ?? 0)),
    0
  );

  investable.forEach((asset) => {
    const share =
      totalContrib > 0
        ? parseFloat(String(asset.monthly_contribution ?? 0)) / totalContrib
        : 1 / investable.length;
    extras.set(
      asset.id,
      extraPerMonth.map((v) => Math.round(v * share * 100) / 100)
    );
  });

  return extras;
}

export function mergeExtraContributionMaps(
  ...maps: Map<string, number[]>[]
): Map<string, number[]> {
  const merged = new Map<string, number[]>();
  maps.forEach((map) => {
    map.forEach((arr, assetId) => {
      if (!merged.has(assetId)) {
        merged.set(assetId, [...arr]);
        return;
      }
      const existing = merged.get(assetId)!;
      for (let i = 0; i < arr.length; i++) {
        existing[i] = (existing[i] ?? 0) + (arr[i] ?? 0);
      }
    });
  });
  return merged;
}
