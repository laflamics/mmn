-- Add discount column to payments table
ALTER TABLE payments ADD COLUMN discount NUMERIC(15, 2) DEFAULT 0;

-- Create index for better query performance
CREATE INDEX idx_payments_discount ON payments(discount);

-- Add comment
COMMENT ON COLUMN payments.discount IS 'Discount/potongan harga dari supplier (AP) atau diskon penjualan (AR)';
