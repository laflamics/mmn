-- Add UOM column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS uom VARCHAR(50) DEFAULT 'ZAK';
ALTER TABLE products ADD COLUMN IF NOT EXISTS uom VARCHAR(50) DEFAULT 'ZAK';

-- Create index for UOM column
CREATE INDEX IF NOT EXISTS idx_products_uom ON products(uom DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_uom ON inventory(uom DESC);