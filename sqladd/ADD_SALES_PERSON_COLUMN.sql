-- Add sales_person column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_person VARCHAR(255);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_customers_sales_person ON customers(sales_person);
