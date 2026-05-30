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
    invest_after_payoff?: boolean;
    payoff_invest_asset_id?: string | null;
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

export type TransactionDirection = 'inflow' | 'outflow';

export interface Transaction {
    id: string;
    user_id: string;
    txn_date: string;
    amount: number;
    direction: TransactionDirection;
    category: string;
    account_id?: string | null;
    description?: string;
    notes?: string;
    source: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateTransactionRequest {
    txn_date: string;
    amount: number;
    direction: TransactionDirection;
    category?: string;
    account_id?: string | null;
    description?: string;
    notes?: string;
    source?: string;
}

export interface UpdateTransactionRequest extends Partial<CreateTransactionRequest> {}

export interface TransactionFilters {
    from?: string;
    to?: string;
    category?: string;
    direction?: TransactionDirection;
    account_id?: string;
}

export interface CategorySpendItem {
    category: string;
    direction: TransactionDirection;
    total: number;
    count: number;
}

export interface MonthlyActualSummary {
    month: string;
    actualInflow: number;
    actualOutflow: number;
    net: number;
    byCategory: CategorySpendItem[];
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
    payoffSeries?: ProjectionPoint[];
}

export interface InvestableHistoryPoint {
    month: string;
    actual: number;
}

export interface InvestmentProjectionsResponse {
    years: number;
    totalCurrentValue: number;
    totalMonthlyContribution: number;
    totalsSeries: ProjectionPoint[];
    historySeries: InvestableHistoryPoint[];
    assetHistories: Record<string, InvestableHistoryPoint[]>;
    assets: AssetProjectionSummary[];
    payoffInvestingTotalsSeries?: ProjectionPoint[];
    payoffEvents?: PayoffRedirectEvent[];
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

export interface PayoffRedirectEvent {
    liabilityId: string;
    liabilityName: string;
    payoffMonth: string;
    monthlyRedirect: number;
    targetAssetId: string;
    targetAssetName: string;
}

export interface NetWorthProjectionsResponse {
    years: number;
    series: NetWorthProjectionPoint[];
    payoffInvestingSeries?: NetWorthProjectionPoint[];
    payoffEvents?: PayoffRedirectEvent[];
    plannedMonthlyContributions: number;
}

export interface UpdateAssetRequest extends Partial<CreateAssetRequest> {}

export interface WealthBuildingBreakdown {
    assetContributions: number;
    debtPrincipal: number;
    specialRepayments: number;
    total: number;
}

export interface DashboardSummary {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    /** Cash-flow surplus: income − expenses (includes interest as expense). */
    monthlySavings: number;
    /** Wealth-building savings rate (% of income): contributions + principal + special repayments. */
    savingsRate: number;
    wealthBuilding: WealthBuildingBreakdown;
    cashFlowSavingsRate: number;
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

export interface BackupIncludes {
    assets: boolean;
    liabilities: boolean;
    income_streams: boolean;
    expenses: boolean;
    asset_value_history: boolean;
    liability_balance_history: boolean;
    net_worth_snapshots: boolean;
    transactions?: boolean;
    liability_features?: string[];
    asset_features?: string[];
}

export interface BackupData {
    version: number;
    exported_at: string;
    /** Present in v2+ exports; documents feature coverage */
    includes?: BackupIncludes;
    assets: Asset[];
    liabilities: Liability[];
    income_streams: IncomeStream[];
    expenses: Expense[];
    asset_value_history: AssetValueHistory[];
    liability_balance_history: LiabilityBalanceHistory[];
    net_worth_snapshots: NetWorthSnapshot[];
    transactions?: Transaction[];
}

export type InsightSeverity = 'positive' | 'info' | 'warning' | 'critical';

export interface InsightMetric {
    label: string;
    value: string;
}

export interface Insight {
    id: string;
    severity: InsightSeverity;
    title: string;
    detail: string;
    metrics?: InsightMetric[];
}

export interface InsightActualContext {
    month: string;
    inflow: number;
    outflow: number;
    net: number;
    /** (inflow - outflow) / inflow × 100 when inflow > 0 */
    savingsRate: number | null;
    plannedIncome: number;
    plannedExpenses: number;
    topCategory: { category: string; total: number } | null;
    /** All inflow categories for this month (from transactions). */
    inflowByCategory: { category: string; total: number }[];
    /** All outflow categories for this month (from transactions). */
    outflowByCategory: { category: string; total: number }[];
}

export interface InsightMetricsContext {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    /** Planned monthly income from income streams (not bank transactions). */
    monthlyIncome: number;
    /** Planned monthly expenses = regularExpenses + totalDebtMonthlyPayments. */
    monthlyExpenses: number;
    /** Recurring budget expenses only (excludes debt payments). */
    regularExpenses: number;
    /** Sum of asset monthly_contribution fields. */
    monthlyAssetContributions: number;
    monthlySavings: number;
    /** Wealth-building rate: (contributions + debt principal + special repayments) / income × 100. */
    savingsRate: number;
    wealthBuilding: WealthBuildingBreakdown;
    /** Cash-flow rate: monthlySavings / monthlyIncome × 100. */
    cashFlowSavingsRate: number;
    liquidAssets: number;
    emergencyRunwayMonths: number | null;
    allocation: AssetAllocation[];
    topAllocation: { type: string; percentage: number } | null;
    highInterestDebts: { name: string; interestRate: number; balance: number }[];
    totalDebtMonthlyPayments: number;
    snapshotCount: number;
    lastSnapshotMonth: string | null;
    monthsSinceLastSnapshot: number | null;
    netWorthChange: { absolute: number; percent: number | null; months: number } | null;
    actual: InsightActualContext | null;
}

export interface InsightsResponse {
    generatedAt: string;
    insights: Insight[];
    metrics: InsightMetricsContext;
}

/**
 * The full set of raw records handed to the optional LLM layer so it can answer
 * detailed, record-level follow-up questions (not just aggregates).
 */
export interface FinancialDatasets {
    assets: Asset[];
    liabilities: Liability[];
    incomeStreams: IncomeStream[];
    expenses: Expense[];
    snapshots: NetWorthSnapshot[];
    transactions: Transaction[];
}

export interface LlmFinanceContext {
    metrics: InsightMetricsContext;
    datasets: FinancialDatasets;
}

export interface CheckInStatus {
    missingMonths: string[];
    recommendedMonth: string;
    lastSnapshotMonth: string | null;
    currentMonth: string;
}

export interface CheckInProposalLineItem {
    id: string;
    name: string;
    type: string;
    previousAmount: number;
    proposedAmount: number;
    delta: number;
    explanation: string;
}

export interface CheckInProposal {
    targetMonth: string;
    baselineMonth: string | null;
    basis: 'snapshot' | 'current';
    offsetMonths: number;
    isHistorical: boolean;
    updatesCurrentState: boolean;
    hasExistingSnapshot: boolean;
    assets: CheckInProposalLineItem[];
    liabilities: CheckInProposalLineItem[];
    totals: {
        assets: number;
        liabilities: number;
        netWorth: number;
    };
}

export interface ApplyCheckInLineItem {
    id: string;
    amount: number;
    name?: string;
    type?: string;
}

export interface ApplyCheckInRequest {
    targetMonth: string;
    assets: ApplyCheckInLineItem[];
    liabilities: ApplyCheckInLineItem[];
    notes?: string;
}
