-- Add created_by_email column to sales_orders table
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);
