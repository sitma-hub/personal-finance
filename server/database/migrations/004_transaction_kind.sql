-- Explicit transaction classification for reliable actual-vs-planned matching.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_kind') THEN
        CREATE TYPE transaction_kind AS ENUM (
            'spending',
            'income',
            'investment',
            'debt_payment',
            'transfer'
        );
    END IF;
END$$;

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS kind transaction_kind NOT NULL DEFAULT 'spending',
    ADD COLUMN IF NOT EXISTS liability_id UUID REFERENCES liabilities(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL;

-- Backfill kind from direction for existing rows.
UPDATE transactions
SET kind = CASE
    WHEN direction = 'inflow' THEN 'income'::transaction_kind
    ELSE 'spending'::transaction_kind
END;

CREATE INDEX IF NOT EXISTS idx_transactions_kind ON transactions(kind);
CREATE INDEX IF NOT EXISTS idx_transactions_liability_id ON transactions(liability_id);
CREATE INDEX IF NOT EXISTS idx_transactions_expense_id ON transactions(expense_id);
