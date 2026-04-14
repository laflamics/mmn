-- Add paid_amount column to track partial payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15, 2) DEFAULT 0;

-- Add columns for payment proof and invoice documents
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- Create index for faster queries on paid_amount
CREATE INDEX IF NOT EXISTS idx_payments_paid_amount ON payments(paid_amount);
