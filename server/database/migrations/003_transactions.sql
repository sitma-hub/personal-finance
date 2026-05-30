-- Transactions ledger: actual income/spending events, optionally linked to an
-- account (asset). Used for actual-vs-planned analysis and insights.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_direction') THEN
        CREATE TYPE transaction_direction AS ENUM ('inflow', 'outflow');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    txn_date DATE NOT NULL,
    amount DECIMAL(20,2) NOT NULL,
    direction transaction_direction NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Uncategorized',
    account_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    description VARCHAR(255),
    notes TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
