-- Add weight column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2) DEFAULT 30;

-- Create index for weight column
CREATE INDEX IF NOT EXISTS idx_products_weight ON products(weight);
