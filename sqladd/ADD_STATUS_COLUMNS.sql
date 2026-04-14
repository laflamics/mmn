-- Add missing columns to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15, 2);

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add missing columns to sales_orders
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15, 2);

ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify columns exist
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('purchase_orders', 'sales_orders')
AND column_name IN ('status', 'total_amount', 'created_at')
ORDER BY table_name, column_name;
