// Type definitions for the frontend

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

export type ScenarioType =
    | 'market_conditions'
    | 'inflation'
    | 'income_growth'
    | 'life_events'
    | 'custom';

export interface Asset {
    id: string;
    user_id: string;
    name: string;
    type: AssetType;
    current_value: number;
    purchase_date?: string;
    purchase_price?: number;
    annual_return_rate?: number;
    monthly_contribution: number;
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
    interest_rate?: number;
    monthly_payment?: number;
    minimum_payment?: number;
    due_date?: string;
    // Month the reported balance applies to (YYYY-MM)
    as_of_month?: string;
    notes?: string;
    // Special repayment fields
    special_repayment_enabled?: boolean;
    special_repayment_amount?: number;
    special_repayment_frequency?: 'monthly' | 'quarterly' | 'annual';
    max_annual_prepayment_percentage?: number;
    prepayment_penalty?: boolean;
    prepayment_penalty_rate?: number;
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

export interface Scenario {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    type: ScenarioType;
    parameters: Record<string, any>;
    time_horizon_years: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ScenarioResult {
    id: string;
    scenario_id: string;
    year: number;
    month: number;
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    monthly_income: number;
    monthly_expenses: number;
    monthly_savings: number;
    asset_breakdown?: Record<string, any>;
    created_at: string;
}

export interface Goal {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    target_amount: number;
    target_date: string;
    current_progress: number;
    priority: number;
    is_achieved: boolean;
    achieved_date?: string;
    created_at: string;
    updated_at: string;
}

export interface MonteCarloSimulation {
    id: string;
    scenario_id: string;
    simulation_name: string;
    iterations: number;
    confidence_levels: Record<string, number>;
    results: Record<string, any>;
    created_at: string;
}

export interface FinancialProjection {
    year: number;
    month: number;
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    monthly_income: number;
    monthly_expenses: number;
    monthly_savings: number;
    asset_breakdown: {
        savings: number;
        investments: number;
        real_estate: number;
        other: number;
    };
    liability_breakdown: {
        mortgages: number;
        loans: number;
        credit_cards: number;
        other: number;
    };
    expense_breakdown: {
        regular_expenses: number;
        liability_payments: number;
    };
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
    };
}

export interface ImportResult {
    imported: number;
    errors: string[];
}

// Form types
export interface AssetFormData {
    name: string;
    type: AssetType;
    current_value: number;
    purchase_date?: string;
    purchase_price?: number;
    annual_return_rate?: number;
    monthly_contribution: number;
    notes?: string;
}

export interface LiabilityFormData {
    name: string;
    type: LiabilityType;
    current_balance: number;
    interest_rate?: number;
    monthly_payment?: number;
    minimum_payment?: number;
    due_date?: string;
    as_of_month?: string;
    notes?: string;
    // Special repayment fields
    special_repayment_enabled?: boolean;
    special_repayment_amount?: number;
    special_repayment_frequency?: 'monthly' | 'quarterly' | 'annual';
    max_annual_prepayment_percentage?: number;
    prepayment_penalty?: boolean;
    prepayment_penalty_rate?: number;
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

export interface ScenarioFormData {
    name: string;
    description?: string;
    type: ScenarioType;
    parameters: Record<string, any>;
    time_horizon_years: number;
}

export interface GoalFormData {
    name: string;
    description?: string;
    target_amount: number;
    target_date: string;
    current_progress: number;
    priority: number;
}
