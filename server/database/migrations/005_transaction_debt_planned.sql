-- Link debt_payment transactions to planned liability lines (regular payment vs Sonderzahlung).

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS debt_planned_component VARCHAR(20);

ALTER TABLE transactions
    DROP CONSTRAINT IF EXISTS transactions_debt_planned_component_check;

ALTER TABLE transactions
    ADD CONSTRAINT transactions_debt_planned_component_check
    CHECK (debt_planned_component IS NULL OR debt_planned_component IN ('regular', 'special'));
