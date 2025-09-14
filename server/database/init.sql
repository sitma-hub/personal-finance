-- Personal Finance Scenario Modeler Database Schema
-- PostgreSQL initialization script

-- Create database if it doesn't exist (this will be handled by Docker)
-- CREATE DATABASE personal_finance_db;

-- Connect to the database
\c personal_finance_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE asset_type AS ENUM (
    'savings_account',
    'checking_account',
    'investment_account',
    'retirement_account',
    'real_estate',
    'vehicle',
    'other_asset'
);

CREATE TYPE liability_type AS ENUM (
    'mortgage',
    'auto_loan',
    'personal_loan',
    'credit_card',
    'student_loan',
    'other_debt'
);

CREATE TYPE income_type AS ENUM (
    'salary',
    'hourly_wage',
    'freelance',
    'investment_income',
    'rental_income',
    'pension',
    'social_security',
    'other_income'
);

CREATE TYPE scenario_type AS ENUM (
    'market_conditions',
    'inflation',
    'income_growth',
    'life_events',
    'custom'
);

-- Users table (simplified for single-user app)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type asset_type NOT NULL,
    current_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    purchase_date DATE,
    purchase_price DECIMAL(15,2),
    annual_return_rate DECIMAL(5,4), -- e.g., 0.07 for 7%
    monthly_contribution DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Investment Holdings table (for detailed investment tracking)
CREATE TABLE investment_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    symbol VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    shares DECIMAL(15,6) NOT NULL,
    purchase_price DECIMAL(10,4) NOT NULL,
    purchase_date DATE NOT NULL,
    current_price DECIMAL(10,4),
    current_value DECIMAL(15,2) GENERATED ALWAYS AS (shares * COALESCE(current_price, purchase_price)) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Real Estate Properties table
CREATE TABLE real_estate_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    property_type VARCHAR(50) NOT NULL, -- 'primary_residence', 'rental', 'vacation_home', etc.
    address TEXT,
    purchase_date DATE NOT NULL,
    purchase_price DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) NOT NULL,
    monthly_rental_income DECIMAL(15,2) DEFAULT 0,
    annual_appreciation_rate DECIMAL(5,4) DEFAULT 0.03, -- Default 3%
    property_taxes_annual DECIMAL(15,2) DEFAULT 0,
    insurance_annual DECIMAL(15,2) DEFAULT 0,
    maintenance_annual DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mortgages table
CREATE TABLE mortgages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES real_estate_properties(id) ON DELETE CASCADE,
    principal_remaining DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,4) NOT NULL,
    monthly_payment DECIMAL(15,2) NOT NULL,
    loan_term_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Liabilities table
CREATE TABLE liabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type liability_type NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,4),
    monthly_payment DECIMAL(15,2),
    minimum_payment DECIMAL(15,2),
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Income Streams table
CREATE TABLE income_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type income_type NOT NULL,
    current_amount DECIMAL(15,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- 'monthly', 'annual', 'hourly'
    annual_growth_rate DECIMAL(5,4) DEFAULT 0.03, -- Default 3%
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    monthly_amount DECIMAL(15,2) NOT NULL,
    annual_inflation_rate DECIMAL(5,4) DEFAULT 0.025, -- Default 2.5%
    is_discretionary BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scenarios table
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type scenario_type NOT NULL,
    parameters JSONB NOT NULL, -- Store scenario-specific parameters
    time_horizon_years INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scenario Results table (for caching calculation results)
CREATE TABLE scenario_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_assets DECIMAL(15,2) NOT NULL,
    total_liabilities DECIMAL(15,2) NOT NULL,
    net_worth DECIMAL(15,2) NOT NULL,
    monthly_income DECIMAL(15,2) NOT NULL,
    monthly_expenses DECIMAL(15,2) NOT NULL,
    monthly_savings DECIMAL(15,2) NOT NULL,
    asset_breakdown JSONB, -- Detailed breakdown by asset type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scenario_id, year, month)
);

-- Goals table
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_amount DECIMAL(15,2) NOT NULL,
    target_date DATE NOT NULL,
    current_progress DECIMAL(15,2) DEFAULT 0,
    priority INTEGER DEFAULT 1, -- 1-5 scale
    is_achieved BOOLEAN DEFAULT false,
    achieved_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Monte Carlo Simulations table
CREATE TABLE monte_carlo_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    simulation_name VARCHAR(255) NOT NULL,
    iterations INTEGER NOT NULL DEFAULT 1000,
    confidence_levels JSONB, -- Store percentiles (5th, 25th, 50th, 75th, 95th)
    results JSONB, -- Store simulation results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_investment_holdings_asset_id ON investment_holdings(asset_id);
CREATE INDEX idx_real_estate_properties_asset_id ON real_estate_properties(asset_id);
CREATE INDEX idx_mortgages_property_id ON mortgages(property_id);
CREATE INDEX idx_liabilities_user_id ON liabilities(user_id);
CREATE INDEX idx_liabilities_type ON liabilities(type);
CREATE INDEX idx_income_streams_user_id ON income_streams(user_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_scenarios_user_id ON scenarios(user_id);
CREATE INDEX idx_scenario_results_scenario_id ON scenario_results(scenario_id);
CREATE INDEX idx_scenario_results_year_month ON scenario_results(year, month);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_monte_carlo_scenario_id ON monte_carlo_simulations(scenario_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investment_holdings_updated_at BEFORE UPDATE ON investment_holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_real_estate_properties_updated_at BEFORE UPDATE ON real_estate_properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mortgages_updated_at BEFORE UPDATE ON mortgages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON liabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_income_streams_updated_at BEFORE UPDATE ON income_streams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default user (since this is a single-user app)
INSERT INTO users (email, name) VALUES ('user@example.com', 'Personal Finance User');
