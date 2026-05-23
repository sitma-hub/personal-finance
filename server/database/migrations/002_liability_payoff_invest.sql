-- Redirect monthly payment into investments after a liability is paid off
ALTER TABLE liabilities
  ADD COLUMN IF NOT EXISTS invest_after_payoff BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payoff_invest_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
