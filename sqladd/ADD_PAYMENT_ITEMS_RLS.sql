-- Enable RLS on payment_items table
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to insert payment items" ON payment_items;
DROP POLICY IF EXISTS "Allow authenticated users to select payment items" ON payment_items;
DROP POLICY IF EXISTS "Allow authenticated users to update payment items" ON payment_items;
DROP POLICY IF EXISTS "Allow authenticated users to delete payment items" ON payment_items;

-- Allow authenticated users to insert payment items
CREATE POLICY "Allow authenticated users to insert payment items" ON payment_items
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to select payment items
CREATE POLICY "Allow authenticated users to select payment items" ON payment_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to update payment items
CREATE POLICY "Allow authenticated users to update payment items" ON payment_items
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete payment items
CREATE POLICY "Allow authenticated users to delete payment items" ON payment_items
  FOR DELETE
  USING (auth.role() = 'authenticated');
