-- Create delivery_notes table
CREATE TABLE IF NOT EXISTS delivery_notes (
  id BIGSERIAL PRIMARY KEY,
  sales_order_id BIGINT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  dn_number VARCHAR(50) UNIQUE,
  delivery_date DATE NOT NULL,
  driver_name VARCHAR(255),
  vehicle_number VARCHAR(50),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_transit, delivered
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create delivery_note_items table
CREATE TABLE IF NOT EXISTS delivery_note_items (
  id BIGSERIAL PRIMARY KEY,
  delivery_note_id BIGINT NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_delivery_notes_sales_order_id ON delivery_notes(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_delivery_note_id ON delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_product_id ON delivery_note_items(product_id);

-- Enable RLS
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_notes
CREATE POLICY "Allow authenticated users to insert delivery_notes" ON delivery_notes
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to select delivery_notes" ON delivery_notes
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update delivery_notes" ON delivery_notes
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete delivery_notes" ON delivery_notes
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- RLS Policies for delivery_note_items
CREATE POLICY "Allow authenticated users to insert delivery_note_items" ON delivery_note_items
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to select delivery_note_items" ON delivery_note_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update delivery_note_items" ON delivery_note_items
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete delivery_note_items" ON delivery_note_items
  FOR DELETE
  USING (auth.role() = 'authenticated');
