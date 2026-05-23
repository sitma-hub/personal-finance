import { Asset, Expense, IncomeStream, Liability, NetWorthProjectionPoint } from '../types';
import { addSeries, monthLabelFromNow } from './projection';
import { getAssetRates, isInvestableForProjection } from './assetProjection';
import { getLiabilityMonthlyPayment, getLiabilityMonthlyRate } from './liabilityCashFlow';
import {
  buildCashFlowExtraByAsset,
  CASH_FLOW_SCENARIOS,
  mergeExtraContributionMaps,
} from './cashFlowProjection';

export interface LiabilityPayoffSimulation {
  balanceSeries: number[];
  payoffMonthIndex: number | null;
  monthlyPayment: number;
}

export function simulateLiabilityPayoff(
  liability: Liability,
  months: number
): LiabilityPayoffSimulation {
  let balance = parseFloat(String(liability.current_balance));
  const payment = getLiabilityMonthlyPayment(liability);
  const rate = getLiabilityMonthlyRate(liability.interest_rate);
  const balanceSeries: number[] = [];
  let payoffMonthIndex: number | null = null;

  for (let m = 0; m < months; m++) {
    if (balance <= 0) {
      balanceSeries.push(0);
      continue;
    }
    const interest = balance * rate;
    const principal = Math.max(0, Math.min(balance, payment - interest));
    balance = Math.max(0, balance - principal);
    balanceSeries.push(Math.round(balance * 100) / 100);
    if (payoffMonthIndex == null && balance <= 0) {
      payoffMonthIndex = m;
    }
  }

  return { balanceSeries, payoffMonthIndex, monthlyPayment: payment };
}

export function projectAssetMonthsVariable(
  startValue: number,
  baseContribution: number,
  extraContributions: number[],
  annualRate: number,
  months: number
): number[] {
  const series: number[] = [];
  let balance = startValue;
  const monthlyRate = annualRate / 12;

  for (let m = 0; m < months; m++) {
    const extra = extraContributions[m] ?? 0;
    balance = balance * (1 + monthlyRate) + baseContribution + extra;
    series.push(Math.round(balance * 100) / 100);
  }

  return series;
}

export function buildExtraContributionsByAsset(
  liabilities: Liability[],
  assets: Asset[],
  months: number
): Map<string, number[]> {
  const extras = new Map<string, number[]>();
  const defaultTarget = assets.find(isInvestableForProjection)?.id;

  liabilities.forEach((liability) => {
    if (!liability.invest_after_payoff) return;

    const targetId = liability.payoff_invest_asset_id || defaultTarget;
    if (!targetId) return;

    const { payoffMonthIndex, monthlyPayment } = simulateLiabilityPayoff(liability, months);
    if (payoffMonthIndex == null || monthlyPayment <= 0) return;

    const startMonth = payoffMonthIndex + 1;
    if (!extras.has(targetId)) {
      extras.set(targetId, Array(months).fill(0));
    }
    const arr = extras.get(targetId)!;
    for (let m = startMonth; m < months; m++) {
      arr[m] = (arr[m] ?? 0) + monthlyPayment;
    }
  });

  return extras;
}

export function amortizeAllLiabilities(liabilities: Liability[], months: number): number[] {
  const sims = liabilities.map((l) => simulateLiabilityPayoff(l, months));
  const series: number[] = [];

  for (let m = 0; m < months; m++) {
    let total = 0;
    sims.forEach((sim) => {
      total += sim.balanceSeries[m] ?? 0;
    });
    series.push(Math.round(total * 100) / 100);
  }

  return series;
}

function buildAssetTotalsWithExtras(
  assets: Asset[],
  extraByScenario: { pessimistic: Map<string, number[]>; expected: Map<string, number[]>; optimistic: Map<string, number[]> },
  months: number
): { assetsPess: number[]; assetsExp: number[]; assetsOpt: number[] } {
  const investable = assets.filter(isInvestableForProjection);
  const flatValue = assets
    .filter((a) => !isInvestableForProjection(a))
    .reduce((s, a) => s + parseFloat(String(a.current_value)), 0);

  let assetsPess = Array(months).fill(flatValue);
  let assetsExp = Array(months).fill(flatValue);
  let assetsOpt = Array(months).fill(flatValue);

  investable.forEach((asset) => {
    const start = parseFloat(String(asset.current_value));
    const base = parseFloat(String(asset.monthly_contribution ?? 0));
    const rates = getAssetRates(asset);
    const extraPess = extraByScenario.pessimistic.get(asset.id) ?? Array(months).fill(0);
    const extraExp = extraByScenario.expected.get(asset.id) ?? Array(months).fill(0);
    const extraOpt = extraByScenario.optimistic.get(asset.id) ?? Array(months).fill(0);
    assetsPess = addSeries(assetsPess, projectAssetMonthsVariable(start, base, extraPess, rates.pessimistic, months));
    assetsExp = addSeries(assetsExp, projectAssetMonthsVariable(start, base, extraExp, rates.expected, months));
    assetsOpt = addSeries(assetsOpt, projectAssetMonthsVariable(start, base, extraOpt, rates.optimistic, months));
  });

  return { assetsPess, assetsExp, assetsOpt };
}

/** Net worth asset totals with income growth, expense inflation, and optional payoff redirect. */
export function buildNetWorthAssetSeries(
  assets: Asset[],
  liabilities: Liability[],
  incomeStreams: IncomeStream[],
  expenses: Expense[],
  months: number,
  includePayoffRedirect: boolean
): { assetsPess: number[]; assetsExp: number[]; assetsOpt: number[] } {
  const payoffExtras = includePayoffRedirect
    ? buildExtraContributionsByAsset(liabilities, assets, months)
    : new Map<string, number[]>();

  const surplusOptions = includePayoffRedirect
    ? { holdRedirectedDebtPayments: true as const }
    : undefined;

  const cashFlowPess = buildCashFlowExtraByAsset(
    assets,
    incomeStreams,
    expenses,
    liabilities,
    months,
    CASH_FLOW_SCENARIOS.pessimistic,
    surplusOptions
  );
  const cashFlowExp = buildCashFlowExtraByAsset(
    assets,
    incomeStreams,
    expenses,
    liabilities,
    months,
    CASH_FLOW_SCENARIOS.expected,
    surplusOptions
  );
  const cashFlowOpt = buildCashFlowExtraByAsset(
    assets,
    incomeStreams,
    expenses,
    liabilities,
    months,
    CASH_FLOW_SCENARIOS.optimistic,
    surplusOptions
  );

  return buildAssetTotalsWithExtras(
    assets,
    {
      pessimistic: mergeExtraContributionMaps(payoffExtras, cashFlowPess),
      expected: mergeExtraContributionMaps(payoffExtras, cashFlowExp),
      optimistic: mergeExtraContributionMaps(payoffExtras, cashFlowOpt),
    },
    months
  );
}

/** @deprecated Use buildNetWorthAssetSeries with includePayoffRedirect: true */
export function buildPayoffInvestingAssetSeries(
  assets: Asset[],
  liabilities: Liability[],
  months: number
): { assetsPess: number[]; assetsExp: number[]; assetsOpt: number[] } {
  return buildNetWorthAssetSeries(assets, liabilities, [], [], months, true);
}

export function buildPayoffEvents(
  liabilities: Liability[],
  assets: Asset[],
  months: number
): Array<{
  liabilityId: string;
  liabilityName: string;
  payoffMonth: string;
  monthlyRedirect: number;
  targetAssetId: string;
  targetAssetName: string;
}> {
  const defaultTarget = assets.find(isInvestableForProjection);
  const events: Array<{
    liabilityId: string;
    liabilityName: string;
    payoffMonth: string;
    monthlyRedirect: number;
    targetAssetId: string;
    targetAssetName: string;
  }> = [];

  liabilities.forEach((liability) => {
    if (!liability.invest_after_payoff) return;
    const { payoffMonthIndex, monthlyPayment } = simulateLiabilityPayoff(liability, months);
    if (payoffMonthIndex == null || monthlyPayment <= 0) return;

    const targetId = liability.payoff_invest_asset_id || defaultTarget?.id;
    if (!targetId) return;
    const target = assets.find((a) => a.id === targetId) ?? defaultTarget;
    if (!target) return;

    events.push({
      liabilityId: liability.id,
      liabilityName: liability.name,
      payoffMonth: monthLabelFromNow(payoffMonthIndex + 1),
      monthlyRedirect: monthlyPayment,
      targetAssetId: target.id,
      targetAssetName: target.name,
    });
  });

  return events;
}

export function toNetWorthSeries(
  assetsPess: number[],
  assetsExp: number[],
  assetsOpt: number[],
  liabSeries: number[],
  months: number
): NetWorthProjectionPoint[] {
  return Array.from({ length: months }, (_, i) => {
    const ap = assetsPess[i] ?? 0;
    const ae = assetsExp[i] ?? 0;
    const ao = assetsOpt[i] ?? 0;
    const lb = liabSeries[i] ?? 0;
    return {
      month: monthLabelFromNow(i + 1),
      assetsPessimistic: ap,
      assetsExpected: ae,
      assetsOptimistic: ao,
      liabilities: lb,
      netWorthPessimistic: ap - lb,
      netWorthExpected: ae - lb,
      netWorthOptimistic: ao - lb,
    };
  });
}
