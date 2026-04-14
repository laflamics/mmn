-- Add signature columns to company_settings table
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS prepared_by_signature_url TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS prepared_by_name VARCHAR(255);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS prepared_by_position VARCHAR(255);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS approved_by_signature_url TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(255);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS approved_by_position VARCHAR(255);

-- Add signature columns to purchase_orders table (for override)
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS prepared_by_signature_url TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS prepared_by_name VARCHAR(255);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS prepared_by_position VARCHAR(255);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by_signature_url TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(255);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by_position VARCHAR(255);
