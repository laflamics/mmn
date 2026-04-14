-- Add ship_to column to purchase_orders table
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS ship_to TEXT;
