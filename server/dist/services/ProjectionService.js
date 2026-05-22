"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectionService = void 0;
const AssetService_1 = require("./AssetService");
const LiabilityService_1 = require("./LiabilityService");
const projection_1 = require("../utils/projection");
const assetProjection_1 = require("../utils/assetProjection");
const liabilityCashFlow_1 = require("../utils/liabilityCashFlow");
class ProjectionService {
    constructor() {
        this.assetService = new AssetService_1.AssetService();
        this.liabilityService = new LiabilityService_1.LiabilityService();
    }
    async getInvestmentProjections(years) {
        const months = years * 12;
        const assets = await this.assetService.getAllAssets();
        const investable = assets.filter(assetProjection_1.isInvestableForProjection);
        const assetSummaries = investable.map((asset) => {
            const series = (0, assetProjection_1.buildAssetProjectionSeries)(asset, months);
            const rates = (0, assetProjection_1.getAssetRates)(asset);
            const at = (y) => {
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
        let totalsPess = [];
        let totalsExp = [];
        let totalsOpt = [];
        assetSummaries.forEach((a) => {
            totalsPess = (0, projection_1.addSeries)(totalsPess, a.series.map((p) => p.pessimistic));
            totalsExp = (0, projection_1.addSeries)(totalsExp, a.series.map((p) => p.expected));
            totalsOpt = (0, projection_1.addSeries)(totalsOpt, a.series.map((p) => p.optimistic));
        });
        const totalsSeries = Array.from({ length: months }, (_, i) => ({
            month: (0, projection_1.monthLabelFromNow)(i + 1),
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
    amortizeLiabilities(liabilities, months) {
        const series = [];
        const balances = liabilities.map((l) => ({
            balance: parseFloat(String(l.current_balance)),
            payment: (0, liabilityCashFlow_1.getLiabilityMonthlyPayment)(l),
            rate: (0, liabilityCashFlow_1.getLiabilityMonthlyRate)(l.interest_rate)
        }));
        for (let m = 0; m < months; m++) {
            let total = 0;
            balances.forEach((item) => {
                if (item.balance <= 0)
                    return;
                const interest = item.balance * item.rate;
                const principal = Math.max(0, Math.min(item.balance, item.payment - interest));
                item.balance = Math.max(0, item.balance - principal);
                total += item.balance;
            });
            series.push(Math.round(total * 100) / 100);
        }
        return series;
    }
    async getNetWorthProjections(years) {
        const months = years * 12;
        const [assets, liabilities] = await Promise.all([
            this.assetService.getAllAssets(),
            this.liabilityService.getAllLiabilities()
        ]);
        const investable = assets.filter(assetProjection_1.isInvestableForProjection);
        const flatValue = assets
            .filter((a) => !(0, assetProjection_1.isInvestableForProjection)(a))
            .reduce((s, a) => s + parseFloat(String(a.current_value)), 0);
        let assetsPess = Array(months).fill(flatValue);
        let assetsExp = Array(months).fill(flatValue);
        let assetsOpt = Array(months).fill(flatValue);
        investable.forEach((asset) => {
            const start = parseFloat(String(asset.current_value));
            const contribution = parseFloat(String(asset.monthly_contribution ?? 0));
            const rates = (0, assetProjection_1.getAssetRates)(asset);
            assetsPess = (0, projection_1.addSeries)(assetsPess, (0, projection_1.projectAssetMonths)(start, contribution, rates.pessimistic, months));
            assetsExp = (0, projection_1.addSeries)(assetsExp, (0, projection_1.projectAssetMonths)(start, contribution, rates.expected, months));
            assetsOpt = (0, projection_1.addSeries)(assetsOpt, (0, projection_1.projectAssetMonths)(start, contribution, rates.optimistic, months));
        });
        const liabilitySeries = this.amortizeLiabilities(liabilities, months);
        const currentLiab = liabilities.reduce((s, l) => s + parseFloat(String(l.current_balance)), 0);
        const liabSeries = liabilitySeries.length > 0 ? liabilitySeries : Array(months).fill(currentLiab);
        const plannedMonthlyContributions = investable.reduce((s, a) => s + parseFloat(String(a.monthly_contribution ?? 0)), 0);
        const series = Array.from({ length: months }, (_, i) => {
            const ap = assetsPess[i] ?? 0;
            const ae = assetsExp[i] ?? 0;
            const ao = assetsOpt[i] ?? 0;
            const lb = liabSeries[i] ?? 0;
            return {
                month: (0, projection_1.monthLabelFromNow)(i + 1),
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
exports.ProjectionService = ProjectionService;
//# sourceMappingURL=ProjectionService.js.map