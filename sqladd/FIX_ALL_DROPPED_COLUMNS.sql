-- Comprehensive fix for all columns dropped by FIX_DUPLICATE_COLUMNS.sql
-- This restores essential columns that should not have been dropped

-- ===== INVOICES =====
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS delivery_note_id BIGINT REFERENCES delivery_notes(id) ON DELETE SET NULL;

-- ===== PAYMENTS =====
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- ===== INVENTORY =====
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2);

-- ===== CUSTOMERS =====
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== PRODUCTS =====
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== SUPPLIERS =====
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== USERS =====
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== PURCHASING_REMINDERS =====
ALTER TABLE purchasing_reminders 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== STOCK_RECEIVES =====
ALTER TABLE stock_receives 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== PO_RECEIVE_ITEMS =====
ALTER TABLE po_receive_items 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== DELIVERY_NOTE_ITEMS =====
ALTER TABLE delivery_note_items 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== PAYMENT_ITEMS =====
ALTER TABLE payment_items 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== COMPANY_SETTINGS =====
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== ROLES =====
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== PERMISSIONS =====
ALTER TABLE permissions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== USER_PERMISSIONS =====
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== CUSTOMER_PRODUCT_PRICING =====
ALTER TABLE customer_product_pricing 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== SALES_ORDER_ITEMS =====
ALTER TABLE sales_order_items 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12, 2);

ALTER TABLE sales_order_items 
ADD COLUMN IF NOT EXISTS total_price DECIMAL(15, 2);

ALTER TABLE sales_order_items 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== INVOICE_ITEMS =====
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify key columns exist
SELECT 'invoices' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('delivery_note_id', 'created_at')
UNION ALL
SELECT 'payments' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('paid_amount', 'payment_proof_url', 'invoice_url', 'created_at')
UNION ALL
SELECT 'sales_order_items' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales_order_items' 
AND column_name IN ('unit_price', 'total_price', 'created_at')
ORDER BY table_name, column_name;
