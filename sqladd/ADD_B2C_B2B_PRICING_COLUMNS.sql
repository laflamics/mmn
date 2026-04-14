-- Add B2C/B2B Pricing Columns
-- Run this migration in Supabase SQL Editor

-- 1. Extend products table dengan B2C pricing variants dan B2B default price
ALTER TABLE products ADD COLUMN IF NOT EXISTS b2c_locco_price_zak DECIMAL(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS b2c_franco_price_zak DECIMAL(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS b2c_cash DECIMAL(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS b2c_top_30 DECIMAL(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS b2b_default_price DECIMAL(12,2);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_b2c_pricing ON products(b2c_locco_price_zak, b2c_franco_price_zak);
CREATE INDEX IF NOT EXISTS idx_products_b2b_pricing ON products(b2b_default_price);

-- 2. Extend customers table dengan pricing_tier untuk B2B segmentation
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pricing_tier VARCHAR(50);

-- Create index for pricing_tier
CREATE INDEX IF NOT EXISTS idx_customers_pricing_tier ON customers(pricing_tier);

-- 3. Extend sales_order_items table untuk track pricing details (audit trail)
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20);
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS unit_type VARCHAR(20);
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS payment_term VARCHAR(20);

-- Create indexes for sales_order_items
CREATE INDEX IF NOT EXISTS idx_sales_order_items_delivery_type ON sales_order_items(delivery_type);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_unit_type ON sales_order_items(unit_type);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_payment_term ON sales_order_items(payment_term);

-- Add comment untuk dokumentasi
COMMENT ON COLUMN products.b2c_locco_price_zak IS 'B2C harga Locco per zak (base price)';
COMMENT ON COLUMN products.b2c_franco_price_zak IS 'B2C harga Franco per zak (base price)';
COMMENT ON COLUMN products.b2c_cash IS 'B2C harga untuk pembayaran Cash (per kg, calculated from zak price)';
COMMENT ON COLUMN products.b2c_top_30 IS 'B2C harga untuk pembayaran TOP 30 hari (per kg, calculated from zak price)';
COMMENT ON COLUMN products.b2b_default_price IS 'B2B default price per unit (fallback kalau tidak ada custom pricing)';
COMMENT ON COLUMN customers.pricing_tier IS 'Tier untuk B2B customers (contoh: B2B_STANDARD, B2B_PREMIUM, B2B_DISTRIBUTOR)';
COMMENT ON COLUMN sales_order_items.delivery_type IS 'LOCCO atau FRANCO (untuk B2C tracking)';
COMMENT ON COLUMN sales_order_items.unit_type IS 'ZAK atau KG (untuk B2C tracking)';
COMMENT ON COLUMN sales_order_items.payment_term IS 'CASH atau TOP_30 (untuk B2C tracking)';
