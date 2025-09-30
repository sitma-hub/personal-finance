-- Add as_of_month column to liabilities to record the month the balance applies to
ALTER TABLE liabilities
ADD COLUMN IF NOT EXISTS as_of_month DATE;

-- Optional index to query by month
CREATE INDEX IF NOT EXISTS idx_liabilities_as_of_month ON liabilities(as_of_month);

