-- Migration: Increase decimal precision for financial fields
-- This migration updates all DECIMAL(15,2) fields to DECIMAL(20,2) to prevent numeric overflow
-- in Monte Carlo simulations and long-term projections

-- Update scenario_results table
ALTER TABLE scenario_results 
ALTER COLUMN total_assets TYPE DECIMAL(20,2),
ALTER COLUMN total_liabilities TYPE DECIMAL(20,2),
ALTER COLUMN net_worth TYPE DECIMAL(20,2),
ALTER COLUMN monthly_income TYPE DECIMAL(20,2),
ALTER COLUMN monthly_expenses TYPE DECIMAL(20,2),
ALTER COLUMN monthly_savings TYPE DECIMAL(20,2);

-- Update assets table
ALTER TABLE assets 
ALTER COLUMN current_value TYPE DECIMAL(20,2),
ALTER COLUMN purchase_price TYPE DECIMAL(20,2),
ALTER COLUMN monthly_contribution TYPE DECIMAL(20,2);

-- Update investment_holdings table
ALTER TABLE investment_holdings 
ALTER COLUMN current_value TYPE DECIMAL(20,2);

-- Update real_estate_properties table
ALTER TABLE real_estate_properties 
ALTER COLUMN purchase_price TYPE DECIMAL(20,2),
ALTER COLUMN current_value TYPE DECIMAL(20,2),
ALTER COLUMN monthly_rental_income TYPE DECIMAL(20,2),
ALTER COLUMN property_taxes_annual TYPE DECIMAL(20,2),
ALTER COLUMN insurance_annual TYPE DECIMAL(20,2),
ALTER COLUMN maintenance_annual TYPE DECIMAL(20,2);

-- Update mortgages table
ALTER TABLE mortgages 
ALTER COLUMN principal_remaining TYPE DECIMAL(20,2),
ALTER COLUMN monthly_payment TYPE DECIMAL(20,2);

-- Update liabilities table
ALTER TABLE liabilities 
ALTER COLUMN current_balance TYPE DECIMAL(20,2),
ALTER COLUMN monthly_payment TYPE DECIMAL(20,2),
ALTER COLUMN minimum_payment TYPE DECIMAL(20,2);

-- Update income_streams table
ALTER TABLE income_streams 
ALTER COLUMN current_amount TYPE DECIMAL(20,2);

-- Update expenses table
ALTER TABLE expenses 
ALTER COLUMN monthly_amount TYPE DECIMAL(20,2);

-- Update goals table
ALTER TABLE goals 
ALTER COLUMN target_amount TYPE DECIMAL(20,2),
ALTER COLUMN current_progress TYPE DECIMAL(20,2);

-- Add comment to document the change
COMMENT ON TABLE scenario_results IS 'Updated DECIMAL precision from (15,2) to (20,2) to prevent numeric overflow in Monte Carlo simulations';
