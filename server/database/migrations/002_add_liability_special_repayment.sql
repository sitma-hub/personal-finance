-- Migration: Add special repayment columns to liabilities table
-- This migration adds the missing special repayment fields that the frontend expects

-- Add special repayment columns to liabilities table
ALTER TABLE liabilities 
ADD COLUMN special_repayment_enabled BOOLEAN DEFAULT false,
ADD COLUMN special_repayment_amount DECIMAL(20,2),
ADD COLUMN special_repayment_frequency VARCHAR(20), -- 'monthly', 'quarterly', 'annual'
ADD COLUMN max_annual_prepayment_percentage DECIMAL(5,4),
ADD COLUMN prepayment_penalty BOOLEAN DEFAULT false,
ADD COLUMN prepayment_penalty_rate DECIMAL(5,4);

-- Add comment to document the change
COMMENT ON TABLE liabilities IS 'Added special repayment fields for advanced liability management';
