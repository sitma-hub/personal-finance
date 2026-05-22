export type AssetType =
    | 'savings_account'
    | 'checking_account'
    | 'investment_account'
    | 'retirement_account'
    | 'real_estate'
    | 'vehicle'
    | 'other_asset';

export type LiabilityType =
    | 'mortgage'
    | 'auto_loan'
    | 'personal_loan'
    | 'credit_card'
    | 'student_loan'
    | 'other_debt';

export type IncomeType =
    | 'salary'
    | 'hourly_wage'
    | 'freelance'
    | 'investment_income'
    | 'rental_income'
    | 'pension'
    | 'social_security'
    | 'other_income';

export interface User {
    id: string;
    email: string;
    name: string;
    created_at: Date;
    updated_at: Date;
}

export const INVESTABLE_ASSET_TYPES: AssetType[] = [
    'investment_account',
    'retirement_account',
    'savings_account'
];

export interface Asset {
    id: string;
    user_id: string;
    name: string;
    type: AssetType;
    current_value: number;
    as_of_date?: Date;
    purchase_date?: Date;
    purchase_price?: number;
    monthly_contribution: number;
    expected_annual_return?: number;
    pessimistic_annual_return?: number;
    optimistic_annual_return?: number;
    include_in_projection: boolean;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}

export interface Liability {
    id: string;
    user_id: string;
    name: string;
    type: LiabilityType;
    current_balance: number;
    as_of_month?: Date;
    interest_rate?: number;
    monthly_payment?: number;
    minimum_payment?: number;
    due_date?: Date;
    notes?: string;
    special_repayment_enabled?: boolean;
    special_repayment_amount?: number;
    special_repayment_frequency?: 'monthly' | 'quarterly' | 'annual';
    max_annual_prepayment_percentage?: number;
    prepayment_penalty?: boolean;
    prepayment_penalty_rate?: number;
    created_at: Date;
    updated_at: Date;
}

export interface IncomeStream {
    id: string;
    user_id: string;
    name: string;
    type: IncomeType;
    current_amount: number;
    frequency: 'monthly' | 'annual' | 'hourly';
    annual_growth_rate: number;
    start_date?: Date;
    end_date?: Date;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}

export interface Expense {
    id: string;
    user_id: string;
    name: string;
    category: string;
    monthly_amount: number;
    annual_inflation_rate: number;
    is_discretionary: boolean;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}

export interface AssetValueHistory {
    id: string;
    asset_id: string;
    value: number;
    as_of_date: Date;
    notes?: string;
    created_at: Date;
}

export interface LiabilityBalanceHistory {
    id: string;
    liability_id: string;
    balance: number;
    as_of_date: Date;
    notes?: string;
    created_at: Date;
}

export interface NetWorthSnapshot {
    id: string;
    snapshot_month: Date;
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    asset_breakdown: SnapshotBreakdownItem[];
    liability_breakdown: SnapshotBreakdownItem[];
    notes?: string;
    created_at: Date;
}

export interface SnapshotBreakdownItem {
    id: string;
    name: string;
    type: string;
    amount: number;
}

export interface CreateAssetRequest {
    name: string;
    type: AssetType;
    current_value: number;
    as_of_date?: string;
    purchase_date?: string;
    purchase_price?: number;
    monthly_contribution?: number;
    expected_annual_return?: number;
    pessimistic_annual_return?: number;
    optimistic_annual_return?: number;
    include_in_projection?: boolean;
    notes?: string;
}

export interface ProjectionPoint {
    month: string;
    pessimistic: number;
    expected: number;
    optimistic: number;
}

export interface AssetProjectionSummary {
    id: string;
    name: string;
    type: AssetType;
    currentValue: number;
    monthlyContribution: number;
    expectedAnnualReturn: number;
    pessimisticAnnualReturn: number;
    optimisticAnnualReturn: number;
    projectedAt5y: { pessimistic: number; expected: number; optimistic: number };
    projectedAt10y: { pessimistic: number; expected: number; optimistic: number };
    projectedAt20y: { pessimistic: number; expected: number; optimistic: number };
    series: ProjectionPoint[];
}

export interface InvestmentProjectionsResponse {
    years: number;
    totalCurrentValue: number;
    totalMonthlyContribution: number;
    totalsSeries: ProjectionPoint[];
    assets: AssetProjectionSummary[];
}

export interface NetWorthProjectionPoint {
    month: string;
    assetsPessimistic: number;
    assetsExpected: number;
    assetsOptimistic: number;
    liabilities: number;
    netWorthPessimistic: number;
    netWorthExpected: number;
    netWorthOptimistic: number;
}

export interface NetWorthProjectionsResponse {
    years: number;
    series: NetWorthProjectionPoint[];
    plannedMonthlyContributions: number;
}

export interface UpdateAssetRequest extends Partial<CreateAssetRequest> {}

export interface DashboardSummary {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
    savingsRate: number;
    assetCount: number;
    liabilityCount: number;
    incomeStreamCount: number;
    expenseCount: number;
    snapshotCount: number;
}

export interface AssetAllocation {
    type: string;
    value: number;
    percentage: number;
}

export interface ExpenseBreakdown {
    category: string;
    amount: number;
    percentage: number;
}

export interface NetWorthTrend {
    month: string;
    netWorth: number;
    assets: number;
    liabilities: number;
}

export interface RecentValueUpdate {
    id: string;
    entityType: 'asset' | 'liability';
    entityId: string;
    entityName: string;
    amount: number;
    asOfDate: string;
    createdAt: string;
}

export interface BackupData {
    version: number;
    exported_at: string;
    assets: Asset[];
    liabilities: Liability[];
    income_streams: IncomeStream[];
    expenses: Expense[];
    asset_value_history: AssetValueHistory[];
    liability_balance_history: LiabilityBalanceHistory[];
    net_worth_snapshots: NetWorthSnapshot[];
}
