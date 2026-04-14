-- Add supplier_id to purchasing_reminders table
-- This allows pre-filling PO creation with the correct supplier

-- Drop existing policies first
DROP POLICY IF EXISTS "Authenticated users can read reminders" ON purchasing_reminders;
DROP POLICY IF EXISTS "Authenticated users can create reminders" ON purchasing_reminders;
DROP POLICY IF EXISTS "Authenticated users can update reminders" ON purchasing_reminders;

ALTER TABLE purchasing_reminders 
ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_purchasing_reminders_supplier_id ON purchasing_reminders(supplier_id);

-- Recreate RLS Policies
CREATE POLICY "Authenticated users can read reminders" ON purchasing_reminders
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create reminders" ON purchasing_reminders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update reminders" ON purchasing_reminders
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
