-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to insert payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to select payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to update payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to delete payments" ON payments;

-- Allow authenticated users to insert payments
CREATE POLICY "Allow authenticated users to insert payments" ON payments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to select payments
CREATE POLICY "Allow authenticated users to select payments" ON payments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to update payments
CREATE POLICY "Allow authenticated users to update payments" ON payments
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete payments
CREATE POLICY "Allow authenticated users to delete payments" ON payments
  FOR DELETE
  USING (auth.role() = 'authenticated');
