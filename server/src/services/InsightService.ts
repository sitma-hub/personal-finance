import { AssetService } from './AssetService';
import { LiabilityService } from './LiabilityService';
import { IncomeService } from './IncomeService';
import { ExpenseService } from './ExpenseService';
import { SnapshotService } from './SnapshotService';
import { TransactionService } from './TransactionService';
import {
  InsightMetricsContext,
  InsightsResponse,
  AssetAllocation,
  LlmFinanceContext,
} from '../types';
import { getTotalLiabilityMonthlyPayments, getLiabilityAnnualRateDecimal } from '../utils/liabilityCashFlow';
import { normalizeSnapshotMonth, monthsBetween, currentMonth } from '../utils/monthUtils';
import { runInsightRules } from '../utils/insightRules';
import {
  computeWealthBuildingBreakdown,
  computeWealthBuildingSavingsRate,
} from '../utils/wealthBuilding';

const LIQUID_ASSET_TYPES = new Set(['savings_account', 'checking_account']);
const HIGH_INTEREST_THRESHOLD = 0.08;

function num(value: unknown): number {
  return parseFloat(String(value ?? 0)) || 0;
}

export class InsightService {
  private assetService = new AssetService();
  private liabilityService = new LiabilityService();
  private incomeService = new IncomeService();
  private expenseService = new ExpenseService();
  private snapshotService = new SnapshotService();
  private transactionService = new TransactionService();

  /**
   * Compute the structured metrics used by both the deterministic rule engine
   * and the optional LLM analysis layer. This is the single source of truth for
   * "what do we know about this person's finances right now".
   */
  async buildMetricsContext(): Promise<InsightMetricsContext> {
    const [assets, liabilities, incomeStreams, expenses, snapshots, monthlyActual] =
      await Promise.all([
        this.assetService.getAllAssets(),
        this.liabilityService.getAllLiabilities(),
        this.incomeService.getAllIncomeStreams(),
        this.expenseService.getAllExpenses(),
        this.snapshotService.getAllSnapshots(),
        this.transactionService.getMonthlyActualSummary(),
      ]);

    const totalAssets = assets.reduce((sum, a) => sum + num(a.current_value), 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + num(l.current_balance), 0);
    const netWorth = totalAssets - totalLiabilities;

    const monthlyIncome = incomeStreams.reduce((sum, income) => {
      const amount = num(income.current_amount);
      switch (income.frequency) {
        case 'monthly':
          return sum + amount;
        case 'annual':
          return sum + amount / 12;
        case 'hourly':
          return sum + (amount * 40 * 52) / 12;
        default:
          return sum + amount;
      }
    }, 0);

    const regularExpenses = expenses.reduce((sum, e) => sum + num(e.monthly_amount), 0);
    const totalDebtMonthlyPayments = getTotalLiabilityMonthlyPayments(liabilities);
    const wealthBuilding = computeWealthBuildingBreakdown(assets, liabilities);
    const monthlyAssetContributions = wealthBuilding.assetContributions;
    const monthlyExpenses = regularExpenses + totalDebtMonthlyPayments;
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = computeWealthBuildingSavingsRate(monthlyIncome, wealthBuilding);
    const cashFlowSavingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    const liquidAssets = assets
      .filter((a) => LIQUID_ASSET_TYPES.has(a.type))
      .reduce((sum, a) => sum + num(a.current_value), 0);
    const emergencyRunwayMonths =
      monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : null;

    const allocation = this.buildAllocation(assets, totalAssets);
    const topAllocation = allocation.length
      ? allocation.reduce((top, a) => (a.percentage > top.percentage ? a : top))
      : null;

    const highInterestDebts = liabilities
      .map((l) => ({
        name: l.name,
        interestRate: getLiabilityAnnualRateDecimal(l.interest_rate),
        balance: num(l.current_balance),
      }))
      .filter((d) => d.interestRate >= HIGH_INTEREST_THRESHOLD && d.balance > 0);

    const { lastSnapshotMonth, monthsSinceLastSnapshot, netWorthChange } =
      this.buildSnapshotTrend(snapshots);

    const inflowByCategory = monthlyActual.byCategory
      .filter((c) => c.direction === 'inflow')
      .map((c) => ({ category: c.category, total: c.total }))
      .sort((a, b) => b.total - a.total);
    const outflowByCategory = monthlyActual.byCategory
      .filter((c) => c.direction === 'outflow')
      .map((c) => ({ category: c.category, total: c.total }))
      .sort((a, b) => b.total - a.total);

    const actual = monthlyActual.actualInflow > 0 || monthlyActual.actualOutflow > 0
      ? {
          month: monthlyActual.month,
          inflow: monthlyActual.actualInflow,
          outflow: monthlyActual.actualOutflow,
          net: monthlyActual.net,
          savingsRate:
            monthlyActual.actualInflow > 0
              ? (monthlyActual.net / monthlyActual.actualInflow) * 100
              : null,
          plannedIncome: monthlyIncome,
          plannedExpenses: monthlyExpenses,
          topCategory: this.topOutflowCategory(monthlyActual.byCategory),
          inflowByCategory,
          outflowByCategory,
        }
      : null;

    return {
      netWorth,
      totalAssets,
      totalLiabilities,
      monthlyIncome,
      monthlyExpenses,
      regularExpenses,
      monthlyAssetContributions,
      monthlySavings,
      savingsRate,
      wealthBuilding,
      cashFlowSavingsRate,
      liquidAssets,
      emergencyRunwayMonths,
      allocation,
      topAllocation: topAllocation
        ? { type: topAllocation.type, percentage: topAllocation.percentage }
        : null,
      highInterestDebts,
      totalDebtMonthlyPayments,
      snapshotCount: snapshots.length,
      lastSnapshotMonth,
      monthsSinceLastSnapshot,
      netWorthChange,
      actual,
    };
  }

  async getInsights(): Promise<InsightsResponse> {
    const metrics = await this.buildMetricsContext();
    const insights = runInsightRules(metrics);
    return {
      generatedAt: new Date().toISOString(),
      insights,
      metrics,
    };
  }

  /**
   * Gather the aggregated metrics plus the full raw record sets. This is what
   * the LLM layer consumes so it has complete visibility into the database and
   * can answer record-level follow-up questions (e.g. "what was my biggest
   * transaction in March?").
   */
  async buildLlmContext(): Promise<LlmFinanceContext> {
    const [metrics, assets, liabilities, incomeStreams, expenses, snapshots, transactions] =
      await Promise.all([
        this.buildMetricsContext(),
        this.assetService.getAllAssets(),
        this.liabilityService.getAllLiabilities(),
        this.incomeService.getAllIncomeStreams(),
        this.expenseService.getAllExpenses(),
        this.snapshotService.getAllSnapshots(),
        this.transactionService.getAll({}),
      ]);

    return {
      metrics,
      datasets: { assets, liabilities, incomeStreams, expenses, snapshots, transactions },
    };
  }

  private buildAllocation(
    assets: Awaited<ReturnType<AssetService['getAllAssets']>>,
    totalAssets: number
  ): AssetAllocation[] {
    if (totalAssets <= 0) return [];
    const map = new Map<string, number>();
    assets.forEach((a) => {
      map.set(a.type, (map.get(a.type) || 0) + num(a.current_value));
    });
    return Array.from(map.entries()).map(([type, value]) => ({
      type,
      value,
      percentage: (value / totalAssets) * 100,
    }));
  }

  private buildSnapshotTrend(
    snapshots: Awaited<ReturnType<SnapshotService['getAllSnapshots']>>
  ): Pick<InsightMetricsContext, 'lastSnapshotMonth' | 'monthsSinceLastSnapshot' | 'netWorthChange'> {
    const parsed = snapshots
      .map((s) => ({
        month: normalizeSnapshotMonth(s.snapshot_month),
        netWorth: num(s.net_worth),
      }))
      .filter((s): s is { month: string; netWorth: number } => s.month != null)
      .sort((a, b) => a.month.localeCompare(b.month));

    if (parsed.length === 0) {
      return { lastSnapshotMonth: null, monthsSinceLastSnapshot: null, netWorthChange: null };
    }

    const latest = parsed[parsed.length - 1]!;
    const monthsSinceLastSnapshot = monthsBetween(latest.month, currentMonth());

    let netWorthChange: InsightMetricsContext['netWorthChange'] = null;
    if (parsed.length >= 2) {
      const baseline = parsed[0]!;
      const months = monthsBetween(baseline.month, latest.month);
      const absolute = latest.netWorth - baseline.netWorth;
      const percent = baseline.netWorth !== 0
        ? (absolute / Math.abs(baseline.netWorth)) * 100
        : null;
      netWorthChange = { absolute, percent, months };
    }

    return {
      lastSnapshotMonth: latest.month,
      monthsSinceLastSnapshot,
      netWorthChange,
    };
  }

  private topOutflowCategory(
    byCategory: { category: string; direction: string; total: number }[]
  ): { category: string; total: number } | null {
    const outflows = byCategory.filter((c) => c.direction === 'outflow');
    if (outflows.length === 0) return null;
    const top = outflows.reduce((best, c) => (c.total > best.total ? c : best));
    return { category: top.category, total: top.total };
  }
}
