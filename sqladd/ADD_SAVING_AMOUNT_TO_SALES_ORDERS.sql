-- Add saving_amount column to sales_orders table
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS saving_amount DECIMAL(15, 2) DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN sales_orders.saving_amount IS 'Saving amount added to the order total (in Rupiah)';
