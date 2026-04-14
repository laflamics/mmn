-- Add receive columns to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS quantity_received INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS receive_date DATE,
ADD COLUMN IF NOT EXISTS receive_photo_url TEXT,
ADD COLUMN IF NOT EXISTS receive_document_url TEXT,
ADD COLUMN IF NOT EXISTS receive_notes TEXT;
