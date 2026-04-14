-- Fix missing columns that were incorrectly dropped by FIX_DUPLICATE_COLUMNS.sql

-- ===== SALES_ORDER_ITEMS =====
-- Add unit_price column back to sales_order_items if it doesn't exist
ALTER TABLE sales_order_items 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12, 2);

-- Add total_price column back to sales_order_items if it doesn't exist
ALTER TABLE sales_order_items 
ADD COLUMN IF NOT EXISTS total_price DECIMAL(15, 2);

-- ===== PURCHASE_ORDER_ITEMS =====
-- Add quantity column back to purchase_order_items if it doesn't exist
ALTER TABLE purchase_order_items 
ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Add unit_price column back to purchase_order_items if it doesn't exist
ALTER TABLE purchase_order_items 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12, 2);

-- Add total_price column back to purchase_order_items if it doesn't exist
ALTER TABLE purchase_order_items 
ADD COLUMN IF NOT EXISTS total_price DECIMAL(15, 2);

-- ===== PURCHASE_ORDERS =====
-- Add payment_type column back to purchase_orders if it doesn't exist
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'COD';

-- Add top_days column back to purchase_orders if it doesn't exist
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS top_days INTEGER DEFAULT 30;

-- Add tax_amount column back to purchase_orders if it doesn't exist
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2) DEFAULT 0;

-- Add discount_amount column back to purchase_orders if it doesn't exist
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15, 2) DEFAULT 0;

-- Add notes column back to purchase_orders if it doesn't exist
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ===== DELIVERY_NOTES =====
-- Ensure delivery_notes has delivery_date column
ALTER TABLE delivery_notes 
ADD COLUMN IF NOT EXISTS delivery_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- ===== SALES_ORDERS =====
-- Add payment_type column back to sales_orders if it doesn't exist
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'COD';

-- Add top_days column back to sales_orders if it doesn't exist
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS top_days INTEGER DEFAULT 30;

-- Add tax_amount column back to sales_orders if it doesn't exist
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2) DEFAULT 0;

-- Add discount_amount column back to sales_orders if it doesn't exist
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15, 2) DEFAULT 0;

-- Add notes column back to sales_orders if it doesn't exist
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ===== PAYMENTS =====
-- Add paid_amount column back to payments if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15, 2) DEFAULT 0;

-- Add payment_proof_url column back to payments if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Add invoice_url column back to payments if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- Verify the columns exist
SELECT 'sales_order_items' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales_order_items' 
AND column_name IN ('unit_price', 'total_price')
UNION ALL
SELECT 'purchase_order_items' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchase_order_items' 
AND column_name IN ('quantity', 'unit_price', 'total_price')
UNION ALL
SELECT 'purchase_orders' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND column_name IN ('payment_type', 'top_days', 'tax_amount', 'discount_amount', 'notes')
UNION ALL
SELECT 'delivery_notes' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'delivery_notes' 
AND column_name = 'delivery_date'
UNION ALL
SELECT 'sales_orders' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales_orders' 
AND column_name IN ('payment_type', 'top_days', 'tax_amount', 'discount_amount', 'notes')
UNION ALL
SELECT 'payments' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('paid_amount', 'payment_proof_url', 'invoice_url')
ORDER BY table_name, column_name;
