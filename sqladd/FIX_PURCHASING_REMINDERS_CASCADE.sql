-- Fix purchasing_reminders foreign key to allow cascade delete
-- Drop the old constraint
ALTER TABLE purchasing_reminders 
DROP CONSTRAINT purchasing_reminders_product_id_fkey;

-- Add new constraint with CASCADE delete
ALTER TABLE purchasing_reminders 
ADD CONSTRAINT purchasing_reminders_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
