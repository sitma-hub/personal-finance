import { AssetService } from './AssetService';
import { LiabilityService } from './LiabilityService';
import { IncomeService } from './IncomeService';
import { ExpenseService } from './ExpenseService';
import { SnapshotService } from './SnapshotService';
import {
  buildInvestableValueHistory,
  buildPerAssetHistories,
} from '../utils/investableHistory';
import { INVESTABLE_ASSET_TYPES } from '../types';
import {
  InvestmentProjectionsResponse,
  NetWorthProjectionsResponse,
  NetWorthProjectionPoint,
  AssetProjectionSummary,
  ProjectionPoint
} from '../types';
import {
  addSeries,
  monthLabelFromNow,
} from '../utils/projection';
import {
  isInvestableForProjection,
  buildAssetProjectionSeries,
  getAssetRates
} from '../utils/assetProjection';
import {
  amortizeAllLiabilities,
  buildExtraContributionsByAsset,
  buildPayoffEvents,
  buildNetWorthAssetSeries,
  projectAssetMonthsVariable,
  toNetWorthSeries,
} from '../utils/payoffInvestProjection';

export class ProjectionService {
  private assetService = new AssetService();
  private liabilityService = new LiabilityService();
  private incomeService = new IncomeService();
  private expenseService = new ExpenseService();
  private snapshotService = new SnapshotService();

  async getInvestmentProjections(years: number): Promise<InvestmentProjectionsResponse> {
    const months = years * 12;
    const assets = await this.assetService.getAllAssets();
    const investableBuckets = assets.filter((a) => INVESTABLE_ASSET_TYPES.includes(a.type));
    const investableIds = investableBuckets.map((a) => a.id);
    const [historyRows, snapshots] = await Promise.all([
      this.assetService.getValueHistoryForAssets(investableIds),
      this.snapshotService.getAllSnapshots(),
    ]);
    const historySeries = buildInvestableValueHistory(investableBuckets, historyRows, snapshots);
    const assetHistories = buildPerAssetHistories(investableBuckets, historyRows);

    const investable = assets.filter(isInvestableForProjection);

    const assetSummaries: AssetProjectionSummary[] = investable.map((asset) => {
      const series = buildAssetProjectionSeries(asset, months);
      const rates = getAssetRates(asset);
      const at = (y: number) => {
        const idx = Math.min(y * 12 - 1, series.length - 1);
        const p = series[idx];
        const start = parseFloat(String(asset.current_value));
        return {
          pessimistic: p?.pessimistic ?? start,
          expected: p?.expected ?? start,
          optimistic: p?.optimistic ?? start
        };
      };
      return {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        currentValue: parseFloat(String(asset.current_value)),
        monthlyContribution: parseFloat(String(asset.monthly_contribution ?? 0)),
        expectedAnnualReturn: rates.expected,
        pessimisticAnnualReturn: rates.pessimistic,
        optimisticAnnualReturn: rates.optimistic,
        projectedAt5y: at(5),
        projectedAt10y: at(10),
        projectedAt20y: at(20),
        series
      };
    });

    let totalsPess: number[] = [];
    let totalsExp: number[] = [];
    let totalsOpt: number[] = [];

    assetSummaries.forEach((a) => {
      totalsPess = addSeries(totalsPess, a.series.map((p) => p.pessimistic));
      totalsExp = addSeries(totalsExp, a.series.map((p) => p.expected));
      totalsOpt = addSeries(totalsOpt, a.series.map((p) => p.optimistic));
    });

    const totalsSeries: ProjectionPoint[] = Array.from({ length: months }, (_, i) => ({
      month: monthLabelFromNow(i + 1),
      pessimistic: totalsPess[i] ?? 0,
      expected: totalsExp[i] ?? 0,
      optimistic: totalsOpt[i] ?? 0
    }));

    const liabilities = await this.liabilityService.getAllLiabilities();
    const hasPayoffRedirect = liabilities.some((l) => l.invest_after_payoff);
    let payoffInvestingTotalsSeries: ProjectionPoint[] | undefined;
    let payoffEvents: ReturnType<typeof buildPayoffEvents> | undefined;

    if (hasPayoffRedirect) {
      const payoffExtras = buildExtraContributionsByAsset(liabilities, assets, months);
      let payoffPess: number[] = [];
      let payoffExp: number[] = [];
      let payoffOpt: number[] = [];

      investable.forEach((asset) => {
        const start = parseFloat(String(asset.current_value));
        const base = parseFloat(String(asset.monthly_contribution ?? 0));
        const rates = getAssetRates(asset);
        const extra = payoffExtras.get(asset.id) ?? Array(months).fill(0);
        const pess = projectAssetMonthsVariable(start, base, extra, rates.pessimistic, months);
        const exp = projectAssetMonthsVariable(start, base, extra, rates.expected, months);
        const opt = projectAssetMonthsVariable(start, base, extra, rates.optimistic, months);

        const summary = assetSummaries.find((s) => s.id === asset.id);
        if (summary) {
          summary.payoffSeries = Array.from({ length: months }, (_, i) => ({
            month: monthLabelFromNow(i + 1),
            pessimistic: pess[i] ?? start,
            expected: exp[i] ?? start,
            optimistic: opt[i] ?? start,
          }));
        }

        payoffPess = addSeries(payoffPess, pess);
        payoffExp = addSeries(payoffExp, exp);
        payoffOpt = addSeries(payoffOpt, opt);
      });

      payoffInvestingTotalsSeries = Array.from({ length: months }, (_, i) => ({
        month: monthLabelFromNow(i + 1),
        pessimistic: payoffPess[i] ?? 0,
        expected: payoffExp[i] ?? 0,
        optimistic: payoffOpt[i] ?? 0
      }));
      payoffEvents = buildPayoffEvents(liabilities, assets, months);
    }

    const response: InvestmentProjectionsResponse = {
      years,
      totalCurrentValue: assetSummaries.reduce((s, a) => s + a.currentValue, 0),
      totalMonthlyContribution: assetSummaries.reduce((s, a) => s + a.monthlyContribution, 0),
      totalsSeries,
      historySeries,
      assetHistories,
      assets: assetSummaries
    };

    if (hasPayoffRedirect && payoffInvestingTotalsSeries && payoffEvents?.length) {
      response.payoffInvestingTotalsSeries = payoffInvestingTotalsSeries;
      response.payoffEvents = payoffEvents;
    }

    return response;
  }

  async getNetWorthProjections(years: number): Promise<NetWorthProjectionsResponse> {
    const months = years * 12;
    const [assets, liabilities, incomeStreams, expenses] = await Promise.all([
      this.assetService.getAllAssets(),
      this.liabilityService.getAllLiabilities(),
      this.incomeService.getAllIncomeStreams(),
      this.expenseService.getAllExpenses(),
    ]);

    const investable = assets.filter(isInvestableForProjection);
    const baselineAssets = buildNetWorthAssetSeries(
      assets,
      liabilities,
      incomeStreams,
      expenses,
      months,
      false
    );
    const assetsPess = baselineAssets.assetsPess;
    const assetsExp = baselineAssets.assetsExp;
    const assetsOpt = baselineAssets.assetsOpt;

    const liabSeries = amortizeAllLiabilities(liabilities, months);
    const currentLiab = liabilities.reduce((s, l) => s + parseFloat(String(l.current_balance)), 0);
    const liabilitiesSeries = liabSeries.some((v) => v > 0) || currentLiab > 0
      ? liabSeries
      : Array(months).fill(0);

    const series: NetWorthProjectionPoint[] = toNetWorthSeries(
      assetsPess,
      assetsExp,
      assetsOpt,
      liabilitiesSeries,
      months
    );

    const plannedMonthlyContributions = investable.reduce(
      (s, a) => s + parseFloat(String(a.monthly_contribution ?? 0)),
      0
    );

    const hasPayoffRedirect = liabilities.some((l) => l.invest_after_payoff);
    let payoffInvestingSeries: NetWorthProjectionPoint[] | undefined;
    let payoffEvents: ReturnType<typeof buildPayoffEvents> | undefined;

    if (hasPayoffRedirect) {
      const payoffAssets = buildNetWorthAssetSeries(
        assets,
        liabilities,
        incomeStreams,
        expenses,
        months,
        true
      );
      payoffInvestingSeries = toNetWorthSeries(
        payoffAssets.assetsPess,
        payoffAssets.assetsExp,
        payoffAssets.assetsOpt,
        liabilitiesSeries,
        months
      );
      payoffEvents = buildPayoffEvents(liabilities, assets, months);
    }

    const response: NetWorthProjectionsResponse = {
      years,
      series,
      plannedMonthlyContributions,
    };

    if (hasPayoffRedirect && payoffInvestingSeries && payoffEvents?.length) {
      response.payoffInvestingSeries = payoffInvestingSeries;
      response.payoffEvents = payoffEvents;
    }

    return response;
  }
}
