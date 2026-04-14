-- Fix quantity columns in inventory table to have max 2 decimal places
-- This will round all existing values to 2 decimals

ALTER TABLE inventory 
ALTER COLUMN quantity_on_hand TYPE NUMERIC(15,2) USING ROUND(quantity_on_hand::NUMERIC, 2);

ALTER TABLE inventory 
ALTER COLUMN quantity_received TYPE NUMERIC(15,2) USING ROUND(quantity_received::NUMERIC, 2);

ALTER TABLE inventory 
ALTER COLUMN quantity_reserved TYPE NUMERIC(15,2) USING ROUND(quantity_reserved::NUMERIC, 2);

ALTER TABLE inventory 
ALTER COLUMN quantity_available TYPE NUMERIC(15,2) USING ROUND(quantity_available::NUMERIC, 2);
