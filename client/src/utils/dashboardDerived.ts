import {
    Asset,
    AssetAllocation,
    DashboardSummary,
    Expense,
    IncomeStream,
    Liability,
    NetWorthSnapshot,
    NetWorthTrend,
} from '../types';
import { getLiabilityMonthlyPayment } from './liabilityCashFlow';
import { normalizeSnapshotMonth } from './dateInput';
import { totalMonthlyIncome } from './monthlyAmounts';

function monthlyExpenseTotal(expenses: Expense[], liabilities: Liability[]): number {
    const regular = expenses.reduce((sum, e) => sum + Number(e.monthly_amount), 0);
    const debt = liabilities.reduce((sum, l) => sum + getLiabilityMonthlyPayment(l), 0);
    return regular + debt;
}

export function buildDashboardSummary(
    assets: Asset[],
    liabilities: Liability[],
    incomeStreams: IncomeStream[],
    expenses: Expense[],
    snapshots: NetWorthSnapshot[]
): DashboardSummary {
    const totalAssets = assets.reduce((sum, a) => sum + Number(a.current_value), 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + Number(l.current_balance), 0);
    const netWorth = totalAssets - totalLiabilities;
    const monthlyIncome = totalMonthlyIncome(incomeStreams);
    const monthlyExpenses = monthlyExpenseTotal(expenses, liabilities);
    const monthlySavings = monthlyIncome - monthlyExpenses;

    return {
        totalAssets,
        totalLiabilities,
        netWorth,
        monthlyIncome,
        monthlyExpenses,
        monthlySavings,
        savingsRate: monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0,
        assetCount: assets.length,
        liabilityCount: liabilities.length,
        incomeStreamCount: incomeStreams.length,
        expenseCount: expenses.length,
        snapshotCount: snapshots.length,
    };
}

export function buildAssetAllocation(assets: Asset[]): AssetAllocation[] {
    const totalValue = assets.reduce((sum, a) => sum + Number(a.current_value), 0);
    if (totalValue === 0) return [];

    const allocationMap = new Map<string, number>();
    assets.forEach((asset) => {
        allocationMap.set(asset.type, (allocationMap.get(asset.type) || 0) + Number(asset.current_value));
    });

    return Array.from(allocationMap.entries()).map(([type, value]) => ({
        type,
        value,
        percentage: (value / totalValue) * 100,
    }));
}

export function buildNetWorthHistory(snapshots: NetWorthSnapshot[]): NetWorthTrend[] {
    return snapshots
        .map((s) => {
            const month = normalizeSnapshotMonth(s.snapshot_month);
            if (!month) return null;
            return {
                month,
                netWorth: Number(s.net_worth),
                assets: Number(s.total_assets),
                liabilities: Number(s.total_liabilities),
            };
        })
        .filter((row): row is NetWorthTrend => row != null)
        .sort((a, b) => a.month.localeCompare(b.month));
}
