import { describe, it, expect } from 'vitest';
import {
    buildDashboardSummary,
    buildAssetAllocation,
    buildNetWorthHistory,
} from '../dashboardDerived';
import type { Asset, Liability, IncomeStream, Expense, NetWorthSnapshot } from '../../types';

const asset = (overrides: Partial<Asset>): Asset =>
    ({
        id: 'a',
        user_id: 'u',
        name: 'Asset',
        type: 'savings_account',
        current_value: 0,
        monthly_contribution: 0,
        include_in_projection: true,
        created_at: '',
        updated_at: '',
        ...overrides,
    } as Asset);

const income = (amount: number): IncomeStream =>
    ({
        id: 'i',
        user_id: 'u',
        name: 'Job',
        type: 'salary',
        current_amount: amount,
        frequency: 'monthly',
        annual_growth_rate: 0,
        created_at: '',
        updated_at: '',
    } as IncomeStream);

const expense = (amount: number): Expense =>
    ({
        id: 'e',
        user_id: 'u',
        name: 'Rent',
        category: 'Housing',
        monthly_amount: amount,
        annual_inflation_rate: 0,
        is_discretionary: false,
        created_at: '',
        updated_at: '',
    } as Expense);

const snapshot = (month: string, netWorth: number): NetWorthSnapshot =>
    ({
        id: month,
        snapshot_month: month,
        total_assets: netWorth,
        total_liabilities: 0,
        net_worth: netWorth,
        asset_breakdown: [],
        liability_breakdown: [],
        created_at: '',
    } as NetWorthSnapshot);

describe('buildDashboardSummary', () => {
    it('computes net worth, cash flow and savings rate', () => {
        const summary = buildDashboardSummary(
            [asset({ current_value: 10000, monthly_contribution: 1000 })],
            [],
            [income(4000)],
            [expense(3000)],
            []
        );
        expect(summary.totalAssets).toBe(10000);
        expect(summary.netWorth).toBe(10000);
        expect(summary.monthlyIncome).toBe(4000);
        expect(summary.monthlyExpenses).toBe(3000);
        expect(summary.monthlySavings).toBe(1000);
        expect(summary.wealthBuilding.total).toBe(1000);
        expect(summary.savingsRate).toBeCloseTo(25);
        expect(summary.cashFlowSavingsRate).toBeCloseTo(25);
    });

    it('reports a zero savings rate when there is no income', () => {
        const summary = buildDashboardSummary([], [], [], [expense(500)], []);
        expect(summary.savingsRate).toBe(0);
    });
});

describe('buildAssetAllocation', () => {
    it('returns percentage allocation grouped by type', () => {
        const allocation = buildAssetAllocation([
            asset({ type: 'savings_account', current_value: 3000 }),
            asset({ type: 'investment_account', current_value: 1000 }),
        ]);
        const savings = allocation.find((a) => a.type === 'savings_account');
        expect(savings?.percentage).toBeCloseTo(75);
    });

    it('returns an empty array when total value is zero', () => {
        expect(buildAssetAllocation([])).toEqual([]);
    });
});

describe('buildNetWorthHistory', () => {
    it('normalizes months and sorts chronologically', () => {
        const history = buildNetWorthHistory([
            snapshot('2026-03', 200),
            snapshot('2026-01', 100),
        ]);
        expect(history.map((h) => h.month)).toEqual(['2026-01', '2026-03']);
    });
});
