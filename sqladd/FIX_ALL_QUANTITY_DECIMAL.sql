-- Fix all quantity columns to support decimal values across all modules
-- This is needed for products that are sold by weight (KG) instead of units (ZAK)

-- Sales Order Items
ALTER TABLE IF EXISTS sales_order_items 
ALTER COLUMN quantity TYPE NUMERIC(10,2);

-- Purchase Order Items
ALTER TABLE IF EXISTS purchase_order_items 
ALTER COLUMN quantity TYPE NUMERIC(10,2);

-- Invoice Items
ALTER TABLE IF EXISTS invoice_items 
ALTER COLUMN quantity TYPE NUMERIC(10,2);

-- Delivery Note Items
ALTER TABLE IF EXISTS delivery_note_items 
ALTER COLUMN quantity TYPE NUMERIC(10,2);

-- Waste Items
ALTER TABLE IF EXISTS waste_items 
ALTER COLUMN quantity TYPE NUMERIC(10,2);

-- Payment Items
ALTER TABLE IF EXISTS payment_items 
ALTER COLUMN quantity_ordered TYPE NUMERIC(10,2),
ALTER COLUMN quantity_received TYPE NUMERIC(10,2);

-- Stock Receives Items
ALTER TABLE IF EXISTS stock_receive_items 
ALTER COLUMN quantity TYPE NUMERIC(10,2);

-- Inventory
ALTER TABLE IF EXISTS inventory 
ALTER COLUMN quantity_on_hand TYPE NUMERIC(10,2),
ALTER COLUMN quantity_reserved TYPE NUMERIC(10,2),
ALTER COLUMN quantity_available TYPE NUMERIC(10,2);
