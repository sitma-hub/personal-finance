import { AssetService } from './AssetService';
import { LiabilityService } from './LiabilityService';
import {
  InvestmentProjectionsResponse,
  NetWorthProjectionsResponse,
  NetWorthProjectionPoint,
  AssetProjectionSummary,
  ProjectionPoint
} from '../types';
import {
  projectAssetMonths,
  addSeries,
  monthLabelFromNow,
} from '../utils/projection';
import {
  isInvestableForProjection,
  buildAssetProjectionSeries,
  getAssetRates
} from '../utils/assetProjection';
import { getLiabilityMonthlyPayment, getLiabilityMonthlyRate } from '../utils/liabilityCashFlow';
import { Liability } from '../types';

export class ProjectionService {
  private assetService = new AssetService();
  private liabilityService = new LiabilityService();

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

  private amortizeLiabilities(liabilities: Liability[], months: number): number[] {
    const series: number[] = [];
    const balances = liabilities.map((l) => ({
      balance: parseFloat(String(l.current_balance)),
      payment: getLiabilityMonthlyPayment(l),
      rate: getLiabilityMonthlyRate(l.interest_rate)
    }));

    for (let m = 0; m < months; m++) {
      let total = 0;
      balances.forEach((item) => {
        if (item.balance <= 0) return;
        const interest = item.balance * item.rate;
        const principal = Math.max(0, Math.min(item.balance, item.payment - interest));
        item.balance = Math.max(0, item.balance - principal);
        total += item.balance;
      });
      series.push(Math.round(total * 100) / 100);
    }
    return series;
  }

  async getNetWorthProjections(years: number): Promise<NetWorthProjectionsResponse> {
    const months = years * 12;
    const [assets, liabilities] = await Promise.all([
      this.assetService.getAllAssets(),
      this.liabilityService.getAllLiabilities()
    ]);

    const investable = assets.filter(isInvestableForProjection);
    const flatValue = assets
      .filter((a) => !isInvestableForProjection(a))
      .reduce((s, a) => s + parseFloat(String(a.current_value)), 0);

    let assetsPess: number[] = Array(months).fill(flatValue);
    let assetsExp: number[] = Array(months).fill(flatValue);
    let assetsOpt: number[] = Array(months).fill(flatValue);

    investable.forEach((asset) => {
      const start = parseFloat(String(asset.current_value));
      const contribution = parseFloat(String(asset.monthly_contribution ?? 0));
      const rates = getAssetRates(asset);
      assetsPess = addSeries(assetsPess, projectAssetMonths(start, contribution, rates.pessimistic, months));
      assetsExp = addSeries(assetsExp, projectAssetMonths(start, contribution, rates.expected, months));
      assetsOpt = addSeries(assetsOpt, projectAssetMonths(start, contribution, rates.optimistic, months));
    });

    const liabilitySeries = this.amortizeLiabilities(liabilities, months);
    const currentLiab = liabilities.reduce((s, l) => s + parseFloat(String(l.current_balance)), 0);
    const liabSeries = liabilitySeries.length > 0 ? liabilitySeries : Array(months).fill(currentLiab);

    const plannedMonthlyContributions = investable.reduce(
      (s, a) => s + parseFloat(String(a.monthly_contribution ?? 0)),
      0
    );

    const series: NetWorthProjectionPoint[] = Array.from({ length: months }, (_, i) => {
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
        netWorthOptimistic: ao - lb
      };
    });

    return { years, series, plannedMonthlyContributions };
  }
}
