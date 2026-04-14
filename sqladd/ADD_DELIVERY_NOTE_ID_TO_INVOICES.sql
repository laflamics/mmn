-- Add delivery_note_id column to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS delivery_note_id BIGINT REFERENCES delivery_notes(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_delivery_note_id ON invoices(delivery_note_id);
