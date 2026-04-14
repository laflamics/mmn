-- Add payment tracking columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Add comment for clarity
COMMENT ON COLUMN invoices.payment_proof_url IS 'URL to uploaded payment proof/transfer receipt';
COMMENT ON COLUMN invoices.last_payment_date IS 'Date of the last payment recorded';
