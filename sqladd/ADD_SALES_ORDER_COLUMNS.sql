-- Add missing columns to sales_orders table
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'COD';
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS top_days INTEGER DEFAULT 30;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add notes column to sales_order_items if missing
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS notes TEXT;
