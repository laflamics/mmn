-- Create customer_product_pricing table for B2B custom pricing
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS customer_product_pricing (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  custom_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, product_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_customer ON customer_product_pricing(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_product ON customer_product_pricing(product_id);

-- Enable RLS
ALTER TABLE customer_product_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read customer product pricing" ON customer_product_pricing
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create customer product pricing" ON customer_product_pricing
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customer product pricing" ON customer_product_pricing
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete customer product pricing" ON customer_product_pricing
  FOR DELETE USING (auth.role() = 'authenticated');
