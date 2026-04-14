-- Add created_by column to sales_orders table
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for created_by
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_by ON sales_orders(created_by);
