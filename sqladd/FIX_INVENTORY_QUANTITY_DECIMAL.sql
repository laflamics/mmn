-- Fix all quantity columns to support decimals (2 decimal places)

-- Inventory table - only these columns exist
ALTER TABLE inventory 
ALTER COLUMN quantity_on_hand TYPE DECIMAL(12, 2);

ALTER TABLE inventory 
ALTER COLUMN quantity_reserved TYPE DECIMAL(12, 2);

ALTER TABLE inventory 
ALTER COLUMN quantity_available TYPE DECIMAL(12, 2);

-- Sales order items table
ALTER TABLE sales_order_items
ALTER COLUMN quantity TYPE DECIMAL(12, 2);

-- Purchase order items table
ALTER TABLE purchase_order_items
ALTER COLUMN quantity TYPE DECIMAL(12, 2);

-- Waste items table
ALTER TABLE waste_items
ALTER COLUMN quantity TYPE DECIMAL(12, 2);

-- Invoice items table
ALTER TABLE invoice_items
ALTER COLUMN quantity TYPE DECIMAL(12, 2);
