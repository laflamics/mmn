-- Add created_at column to existing tables that don't have it

-- Add created_at to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add created_at to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add created_at to suppliers table
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add created_at to inventory table
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for created_at columns for better query performance
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory(created_at DESC);


ADD COLUMN IF NOT EXISTS created_at  UOM DEFAULT ZAK;

CREATE INDEX IF NOT EXISTS idx_products_uom ON products(UOM DESC);