// Type definitions for the Personal Finance Scenario Modeler

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

export interface User {
    id: string;
    email: string;
    name: string;
    created_at: Date;
    updated_at: Date;
}

export interface Asset {
    id: string;
    user_id: string;
    name: string;
    type: AssetType;
    current_value: number;
    purchase_date?: Date;
    purchase_price?: number;
    annual_return_rate?: number;
    monthly_contribution: number;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}

export interface InvestmentHolding {
    id: string;
    asset_id: string;
    symbol?: string;
    name: string;
    shares: number;
    purchase_price: number;
    purchase_date: Date;
    current_price?: number;
    current_value: number;
    created_at: Date;
    updated_at: Date;
}

export interface RealEstateProperty {
    id: string;
    asset_id: string;
    property_type: string;
    address?: string;
    purchase_date: Date;
    purchase_price: number;
    current_value: number;
    monthly_rental_income: number;
    annual_appreciation_rate: number;
    property_taxes_annual: number;
    insurance_annual: number;
    maintenance_annual: number;
    created_at: Date;
    updated_at: Date;
}

export interface Mortgage {
    id: string;
    property_id: string;
    principal_remaining: number;
    interest_rate: number;
    monthly_payment: number;
    loan_term_months: number;
    start_date: Date;
    created_at: Date;
    updated_at: Date;
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
    due_date?: Date;
    notes?: string;
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

export interface Scenario {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    type: ScenarioType;
    parameters: Record<string, any>;
    time_horizon_years: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
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
    created_at: Date;
}

export interface Goal {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    target_amount: number;
    target_date: Date;
    current_progress: number;
    priority: number;
    is_achieved: boolean;
    achieved_date?: Date;
    created_at: Date;
    updated_at: Date;
}

export interface MonteCarloSimulation {
    id: string;
    scenario_id: string;
    simulation_name: string;
    iterations: number;
    confidence_levels: Record<string, number>;
    results: Record<string, any>;
    created_at: Date;
}

// API Request/Response types
export interface CreateAssetRequest {
    name: string;
    type: AssetType;
    current_value: number;
    purchase_date?: string;
    purchase_price?: number;
    annual_return_rate?: number;
    monthly_contribution?: number;
    notes?: string;
}

export interface UpdateAssetRequest extends Partial<CreateAssetRequest> { }

export interface CreateScenarioRequest {
    name: string;
    description?: string;
    type: ScenarioType;
    parameters: Record<string, any>;
    time_horizon_years: number;
}

export interface ScenarioParameters {
    market_return_rate?: number;
    inflation_rate?: number;
    income_growth_rate?: number;
    expense_inflation_rate?: number;
    market_crash_probability?: number;
    market_crash_severity?: number;
    job_loss_probability?: number;
    job_loss_duration_months?: number;
    custom_parameters?: Record<string, any>;
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
}

export interface MonteCarloResult {
    percentiles: {
        p5: number;
        p25: number;
        p50: number;
        p75: number;
        p95: number;
    };
    mean: number;
    standard_deviation: number;
    probability_of_goal: number;
    iterations: number;
}

// Import/Export types
export interface ImportData {
    assets?: Asset[];
    liabilities?: Liability[];
    income_streams?: IncomeStream[];
    expenses?: Expense[];
}

export interface ExportData extends ImportData {
    scenarios?: Scenario[];
    goals?: Goal[];
}
