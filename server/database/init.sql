-- Personal Net Worth Tracker — PostgreSQL schema (local dev)

\c personal_finance_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type asset_type NOT NULL,
    current_value DECIMAL(20,2) NOT NULL DEFAULT 0,
    as_of_date DATE,
    purchase_date DATE,
    purchase_price DECIMAL(20,2),
    monthly_contribution DECIMAL(20,2) NOT NULL DEFAULT 0,
    expected_annual_return DECIMAL(5,4),
    pessimistic_annual_return DECIMAL(5,4),
    optimistic_annual_return DECIMAL(5,4),
    include_in_projection BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE liabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type liability_type NOT NULL,
    current_balance DECIMAL(20,2) NOT NULL,
    as_of_month DATE,
    interest_rate DECIMAL(5,4),
    monthly_payment DECIMAL(20,2),
    minimum_payment DECIMAL(20,2),
    due_date DATE,
    notes TEXT,
    special_repayment_enabled BOOLEAN DEFAULT false,
    special_repayment_amount DECIMAL(20,2),
    special_repayment_frequency VARCHAR(20),
    max_annual_prepayment_percentage DECIMAL(5,4),
    prepayment_penalty BOOLEAN DEFAULT false,
    prepayment_penalty_rate DECIMAL(5,4),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE income_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type income_type NOT NULL,
    current_amount DECIMAL(20,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    annual_growth_rate DECIMAL(5,4) DEFAULT 0.03,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    monthly_amount DECIMAL(20,2) NOT NULL,
    annual_inflation_rate DECIMAL(5,4) DEFAULT 0.025,
    is_discretionary BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asset_value_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    value DECIMAL(20,2) NOT NULL,
    as_of_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE liability_balance_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    liability_id UUID NOT NULL REFERENCES liabilities(id) ON DELETE CASCADE,
    balance DECIMAL(20,2) NOT NULL,
    as_of_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE net_worth_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_month DATE NOT NULL,
    total_assets DECIMAL(20,2) NOT NULL,
    total_liabilities DECIMAL(20,2) NOT NULL,
    net_worth DECIMAL(20,2) NOT NULL,
    asset_breakdown JSONB NOT NULL DEFAULT '[]',
    liability_breakdown JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snapshot_month)
);

CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_liabilities_user_id ON liabilities(user_id);
CREATE INDEX idx_liabilities_type ON liabilities(type);
CREATE INDEX idx_income_streams_user_id ON income_streams(user_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_asset_value_history_asset_id ON asset_value_history(asset_id);
CREATE INDEX idx_asset_value_history_as_of_date ON asset_value_history(as_of_date);
CREATE INDEX idx_liability_balance_history_liability_id ON liability_balance_history(liability_id);
CREATE INDEX idx_liability_balance_history_as_of_date ON liability_balance_history(as_of_date);
CREATE INDEX idx_net_worth_snapshots_month ON net_worth_snapshots(snapshot_month);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON liabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_income_streams_updated_at BEFORE UPDATE ON income_streams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO users (email, name) VALUES ('user@example.com', 'Personal Finance User');
