-- Add created_by and created_by_email columns to purchase_orders table
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);

-- Add index for created_by
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);
