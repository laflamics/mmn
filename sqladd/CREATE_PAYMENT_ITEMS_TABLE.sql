-- Create payment_items table to store detailed items for each payment
CREATE TABLE IF NOT EXISTS payment_items (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  purchase_order_item_id BIGINT NOT NULL REFERENCES purchase_order_items(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100) NOT NULL,
  quantity_ordered BIGINT NOT NULL,
  quantity_received BIGINT NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_items_payment_id ON payment_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_purchase_order_item_id ON payment_items(purchase_order_item_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_product_id ON payment_items(product_id);
