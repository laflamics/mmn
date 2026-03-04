-- Add type column to products table
-- Run this migration in Supabase SQL Editor

ALTER TABLE products ADD COLUMN IF NOT EXISTS type VARCHAR(100);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
