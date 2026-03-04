-- Add customer_code column to customers table
-- Run this migration in Supabase SQL Editor

ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50) UNIQUE;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);

-- Optional: Generate customer codes for existing customers if needed
-- UPDATE customers SET customer_code = 'CUST-' || LPAD(id::text, 5, '0') WHERE customer_code IS NULL;
