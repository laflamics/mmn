-- Make invoice_id nullable to support both AR (invoice) and AP (purchase order) payments
ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL;

-- Add constraint to ensure either invoice_id or purchase_order_id is provided
ALTER TABLE payments ADD CONSTRAINT check_payment_reference 
  CHECK (invoice_id IS NOT NULL OR purchase_order_id IS NOT NULL);
