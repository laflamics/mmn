-- Fix duplicate columns across all tables
-- Run this to remove duplicate columns created by running scripts multiple times

-- sales_order_items
ALTER TABLE sales_order_items DROP COLUMN IF EXISTS unit_price CASCADE;
ALTER TABLE sales_order_items DROP COLUMN IF EXISTS total_price CASCADE;
ALTER TABLE sales_order_items DROP COLUMN IF EXISTS created_at CASCADE;
ALTER TABLE sales_order_items DROP COLUMN IF EXISTS notes CASCADE;
ALTER TABLE sales_order_items DROP COLUMN IF EXISTS delivery_type CASCADE;
ALTER TABLE sales_order_items DROP COLUMN IF EXISTS unit_type CASCADE;
ALTER TABLE sales_order_items DROP COLUMN IF EXISTS payment_term CASCADE;

-- sales_orders
ALTER TABLE sales_orders DROP COLUMN IF EXISTS tax_amount CASCADE;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS discount_amount CASCADE;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS notes CASCADE;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS payment_type CASCADE;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS top_days CASCADE;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS created_by CASCADE;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS created_by_email CASCADE;

-- purchase_order_items
ALTER TABLE purchase_order_items DROP COLUMN IF EXISTS quantity CASCADE;
ALTER TABLE purchase_order_items DROP COLUMN IF EXISTS unit_price CASCADE;
ALTER TABLE purchase_order_items DROP COLUMN IF EXISTS total_price CASCADE;
ALTER TABLE purchase_order_items DROP COLUMN IF EXISTS created_at CASCADE;
ALTER TABLE purchase_order_items DROP COLUMN IF EXISTS received_quantity CASCADE;

-- purchase_orders
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS total_amount CASCADE;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS status CASCADE;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS created_at CASCADE;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS created_by CASCADE;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS created_by_email CASCADE;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS payment_type CASCADE;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS top_days CASCADE;

-- invoices
ALTER TABLE invoices DROP COLUMN IF EXISTS created_at CASCADE;
ALTER TABLE invoices DROP COLUMN IF EXISTS delivery_note_id CASCADE;

-- delivery_notes
ALTER TABLE delivery_notes DROP COLUMN IF EXISTS created_at CASCADE;
ALTER TABLE delivery_notes DROP COLUMN IF EXISTS delivery_date CASCADE;

-- payments
ALTER TABLE payments DROP COLUMN IF EXISTS created_at CASCADE;
ALTER TABLE payments DROP COLUMN IF EXISTS paid_amount CASCADE;
ALTER TABLE payments DROP COLUMN IF EXISTS payment_proof_url CASCADE;
ALTER TABLE payments DROP COLUMN IF EXISTS invoice_url CASCADE;

-- inventory
ALTER TABLE inventory DROP COLUMN IF EXISTS quantity CASCADE;

-- customers
ALTER TABLE customers DROP COLUMN IF EXISTS created_at CASCADE;

-- products
ALTER TABLE products DROP COLUMN IF EXISTS created_at CASCADE;

-- suppliers
ALTER TABLE suppliers DROP COLUMN IF EXISTS created_at CASCADE;

-- users
ALTER TABLE users DROP COLUMN IF EXISTS created_at CASCADE;

-- purchasing_reminders
ALTER TABLE purchasing_reminders DROP COLUMN IF EXISTS created_at CASCADE;
ALTER TABLE purchasing_reminders DROP COLUMN IF EXISTS supplier_id CASCADE;

-- stock_receives
ALTER TABLE stock_receives DROP COLUMN IF EXISTS created_at CASCADE;

-- po_receive_items
ALTER TABLE po_receive_items DROP COLUMN IF EXISTS created_at CASCADE;

-- delivery_note_items
ALTER TABLE delivery_note_items DROP COLUMN IF EXISTS created_at CASCADE;

-- payment_items
ALTER TABLE payment_items DROP COLUMN IF EXISTS created_at CASCADE;

-- company_settings
ALTER TABLE company_settings DROP COLUMN IF EXISTS created_at CASCADE;

-- roles
ALTER TABLE roles DROP COLUMN IF EXISTS created_at CASCADE;

-- permissions
ALTER TABLE permissions DROP COLUMN IF EXISTS created_at CASCADE;

-- user_permissions
ALTER TABLE user_permissions DROP COLUMN IF EXISTS created_at CASCADE;

-- customer_product_pricing
ALTER TABLE customer_product_pricing DROP COLUMN IF EXISTS created_at CASCADE;
