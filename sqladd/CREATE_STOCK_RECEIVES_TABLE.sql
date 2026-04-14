-- Create stock_receives table
CREATE TABLE IF NOT EXISTS stock_receives (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  photo_url TEXT,
  document_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stock_receive_items table
CREATE TABLE IF NOT EXISTS stock_receive_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  stock_receive_id BIGINT NOT NULL REFERENCES stock_receives(id) ON DELETE CASCADE,
  purchase_order_item_id BIGINT NOT NULL REFERENCES purchase_order_items(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity_received INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stock_receives_purchase_order_id ON stock_receives(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_receives_supplier_id ON stock_receives(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_receives_received_date ON stock_receives(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_receive_items_stock_receive_id ON stock_receive_items(stock_receive_id);
CREATE INDEX IF NOT EXISTS idx_stock_receive_items_product_id ON stock_receive_items(product_id);

-- Enable RLS
ALTER TABLE stock_receives ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_receive_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read stock_receives" ON stock_receives
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create stock_receives" ON stock_receives
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stock_receives" ON stock_receives
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read stock_receive_items" ON stock_receive_items
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create stock_receive_items" ON stock_receive_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
