-- Add delivery_date column to purchase_orders table
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
