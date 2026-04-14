-- Add discount column to purchase_orders table
ALTER TABLE purchase_orders ADD COLUMN discount NUMERIC(15, 2) DEFAULT 0;

-- Create index for better query performance
CREATE INDEX idx_purchase_orders_discount ON purchase_orders(discount);

-- Add comment
COMMENT ON COLUMN purchase_orders.discount IS 'Discount/potongan harga dari supplier';
