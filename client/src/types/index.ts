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

export const INVESTABLE_ASSET_TYPES: AssetType[] = [
    'investment_account',
    'retirement_account',
    'savings_account',
];

export interface Asset {
    id: string;
    user_id: string;
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
    created_at: string;
    updated_at: string;
}

export interface Liability {
    id: string;
    user_id: string;
    name: string;
    type: LiabilityType;
    current_balance: number;
    as_of_month?: string;
    interest_rate?: number;
    monthly_payment?: number;
    minimum_payment?: number;
    due_date?: string;
    notes?: string;
    special_repayment_enabled?: boolean;
    special_repayment_amount?: number;
    special_repayment_frequency?: 'monthly' | 'quarterly' | 'annual';
    max_annual_prepayment_percentage?: number;
    prepayment_penalty?: boolean;
    prepayment_penalty_rate?: number;
    invest_after_payoff?: boolean;
    payoff_invest_asset_id?: string | null;
    created_at: string;
    updated_at: string;
}

export interface IncomeStream {
    id: string;
    user_id: string;
    name: string;
    type: IncomeType;
    current_amount: number;
    frequency: 'monthly' | 'annual' | 'hourly';
    annual_growth_rate: number;
    start_date?: string;
    end_date?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
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
    created_at: string;
    updated_at: string;
}

export interface NetWorthSnapshot {
    id: string;
    snapshot_month: string;
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    asset_breakdown: SnapshotBreakdownItem[];
    liability_breakdown: SnapshotBreakdownItem[];
    notes?: string;
    created_at: string;
}

export interface SnapshotBreakdownItem {
    id: string;
    name: string;
    type: string;
    amount: number;
}

export interface AssetValueHistory {
    id: string;
    asset_id: string;
    value: number;
    as_of_date: string;
    notes?: string;
    created_at: string;
}

export type TransactionDirection = 'inflow' | 'outflow';

export type TransactionKind = 'spending' | 'income' | 'investment' | 'debt_payment' | 'transfer';

export type DebtPlannedComponent = 'regular' | 'special';

export interface Transaction {
    id: string;
    user_id: string;
    txn_date: string;
    amount: number;
    direction: TransactionDirection;
    kind: TransactionKind;
    category: string;
    account_id?: string | null;
    liability_id?: string | null;
    expense_id?: string | null;
    debt_planned_component?: DebtPlannedComponent | null;
    description?: string;
    notes?: string;
    source: string;
    created_at: string;
    updated_at: string;
}

export interface TransactionFormData {
    txn_date: string;
    amount: number;
    direction: TransactionDirection;
    kind: TransactionKind;
    category: string;
    account_id?: string | null;
    liability_id?: string | null;
    expense_id?: string | null;
    debt_planned_component?: DebtPlannedComponent | null;
    planned_outflow?: string;
    description?: string;
    notes?: string;
    source?: string;
}

export interface TransactionFilters {
    from?: string;
    to?: string;
    category?: string;
    direction?: TransactionDirection;
    kind?: TransactionKind;
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
    actualIncome: number;
    /** Spending + full debt payments; comparable to planned expenses. */
    actualSpending: number;
    actualSavingsInvestments: number;
    debtInterest: number;
    debtPrincipal: number;
    net: number;
    byCategory: CategorySpendItem[];
}

export interface LiabilityBalanceHistory {
    id: string;
    liability_id: string;
    balance: number;
    as_of_date: string;
    notes?: string;
    created_at: string;
}

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
    monthlySavings: number;
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

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: { message: string };
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

export interface InsightsResponse {
    generatedAt: string;
    insights: Insight[];
    metrics: Record<string, unknown>;
}

export type LlmProcessor = 'gpu' | 'cpu' | 'partial' | null;

export interface LlmStatus {
    enabled: boolean;
    available: boolean;
    model: string;
    processor: LlmProcessor;
    gpuPercent: number | null;
}

export interface LlmAnalysisResponse {
    enabled: boolean;
    model: string;
    analysis: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface LlmChatResponse {
    enabled: boolean;
    model: string;
    reply: string;
}

export interface AssetFormData {
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

export interface IncomeFormData {
    name: string;
    type: IncomeType;
    current_amount: number;
    frequency: 'monthly' | 'annual' | 'hourly';
    annual_growth_rate: number;
    start_date?: string;
    end_date?: string;
    notes?: string;
}

export interface ExpenseFormData {
    name: string;
    category: string;
    monthly_amount: number;
    annual_inflation_rate: number;
    is_discretionary: boolean;
    notes?: string;
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
