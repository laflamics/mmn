-- Add columns to payments table for purchase order payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'ar'; -- 'ar' for AR payments, 'ap' for AP payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'; -- pending, completed, cancelled
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_purchase_order_id ON payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
