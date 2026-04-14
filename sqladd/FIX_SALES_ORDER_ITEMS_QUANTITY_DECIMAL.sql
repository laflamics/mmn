-- Fix sales_order_items and purchase_order_items quantity columns to support decimals
ALTER TABLE sales_order_items 
ALTER COLUMN quantity TYPE DECIMAL(12, 2);

ALTER TABLE purchase_order_items 
ALTER COLUMN quantity TYPE DECIMAL(12, 2);
