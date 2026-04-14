-- Create purchasing reminders table
CREATE TABLE IF NOT EXISTS purchasing_reminders (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE CASCADE,
  shortage_qty NUMERIC(10,2) NOT NULL,
  uom VARCHAR(50),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending' -- pending, acknowledged, completed
);

-- Enable RLS
ALTER TABLE purchasing_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read reminders" ON purchasing_reminders
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create reminders" ON purchasing_reminders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update reminders" ON purchasing_reminders
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Index for faster queries
CREATE INDEX idx_purchasing_reminders_status ON purchasing_reminders(status);
CREATE INDEX idx_purchasing_reminders_product_id ON purchasing_reminders(product_id);
CREATE INDEX idx_purchasing_reminders_supplier_id ON purchasing_reminders(supplier_id);
