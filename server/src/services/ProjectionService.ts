import { AssetService } from './AssetService';
import { LiabilityService } from './LiabilityService';
import { IncomeService } from './IncomeService';
import { ExpenseService } from './ExpenseService';
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
  buildPayoffEvents,
  buildNetWorthAssetSeries,
  toNetWorthSeries,
} from '../utils/payoffInvestProjection';

export class ProjectionService {
  private assetService = new AssetService();
  private liabilityService = new LiabilityService();
  private incomeService = new IncomeService();
  private expenseService = new ExpenseService();

  async getInvestmentProjections(years: number): Promise<InvestmentProjectionsResponse> {
    const months = years * 12;
    const assets = await this.assetService.getAllAssets();
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

    return {
      years,
      totalCurrentValue: assetSummaries.reduce((s, a) => s + a.currentValue, 0),
      totalMonthlyContribution: assetSummaries.reduce((s, a) => s + a.monthlyContribution, 0),
      totalsSeries,
      assets: assetSummaries
    };
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
