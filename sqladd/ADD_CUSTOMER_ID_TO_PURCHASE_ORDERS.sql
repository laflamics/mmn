-- Add customer_id column to purchase_orders for tracking which customer the PO is for
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_customer_id ON purchase_orders(customer_id);
