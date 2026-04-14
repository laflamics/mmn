-- Enable RLS on po_receive_items table and add policies

-- Enable RLS
ALTER TABLE po_receive_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read po_receive_items
CREATE POLICY "Authenticated users can read po_receive_items" ON po_receive_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to create po_receive_items
CREATE POLICY "Authenticated users can create po_receive_items" ON po_receive_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update po_receive_items
CREATE POLICY "Authenticated users can update po_receive_items" ON po_receive_items
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete po_receive_items
CREATE POLICY "Authenticated users can delete po_receive_items" ON po_receive_items
  FOR DELETE USING (auth.role() = 'authenticated');
