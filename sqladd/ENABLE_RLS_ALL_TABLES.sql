-- Enable RLS on all public tables that don't have it

-- Enable RLS on all tables (only if they exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_permissions') THEN
    ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory') THEN
    ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_orders') THEN
    ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_order_items') THEN
    ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_items') THEN
    ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'po_receive_items') THEN
    ALTER TABLE po_receive_items ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_items') THEN
    ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_notes') THEN
    ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_receives') THEN
    ALTER TABLE stock_receives ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchasing_reminders') THEN
    ALTER TABLE purchasing_reminders ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_settings') THEN
    ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_sku_lock') THEN
    ALTER TABLE customer_sku_lock ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add comprehensive RLS policies for all tables

-- Users table
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Roles table
DROP POLICY IF EXISTS "Authenticated users can read roles" ON roles;
CREATE POLICY "Authenticated users can read roles" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Permissions table
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON permissions;
CREATE POLICY "Authenticated users can read permissions" ON permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- User permissions table
DROP POLICY IF EXISTS "Users can read own permissions" ON user_permissions;
CREATE POLICY "Users can read own permissions" ON user_permissions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can manage permissions" ON user_permissions;
CREATE POLICY "Authenticated users can manage permissions" ON user_permissions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update permissions" ON user_permissions;
CREATE POLICY "Authenticated users can update permissions" ON user_permissions
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete permissions" ON user_permissions;
CREATE POLICY "Authenticated users can delete permissions" ON user_permissions
  FOR DELETE USING (auth.role() = 'authenticated');

-- Products table
DROP POLICY IF EXISTS "Authenticated users can read products" ON products;
CREATE POLICY "Authenticated users can read products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create products" ON products;
CREATE POLICY "Authenticated users can create products" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
CREATE POLICY "Authenticated users can update products" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Customers table
DROP POLICY IF EXISTS "Authenticated users can read customers" ON customers;
CREATE POLICY "Authenticated users can read customers" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create customers" ON customers;
CREATE POLICY "Authenticated users can create customers" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
CREATE POLICY "Authenticated users can update customers" ON customers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Suppliers table
DROP POLICY IF EXISTS "Authenticated users can read suppliers" ON suppliers;
CREATE POLICY "Authenticated users can read suppliers" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create suppliers" ON suppliers;
CREATE POLICY "Authenticated users can create suppliers" ON suppliers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON suppliers;
CREATE POLICY "Authenticated users can update suppliers" ON suppliers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Inventory table
DROP POLICY IF EXISTS "Authenticated users can read inventory" ON inventory;
CREATE POLICY "Authenticated users can read inventory" ON inventory
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update inventory" ON inventory;
CREATE POLICY "Authenticated users can update inventory" ON inventory
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Sales orders table
DROP POLICY IF EXISTS "Authenticated users can read sales orders" ON sales_orders;
CREATE POLICY "Authenticated users can read sales orders" ON sales_orders
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create sales orders" ON sales_orders;
CREATE POLICY "Authenticated users can create sales orders" ON sales_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update sales orders" ON sales_orders;
CREATE POLICY "Authenticated users can update sales orders" ON sales_orders
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Sales order items table
DROP POLICY IF EXISTS "Authenticated users can read sales order items" ON sales_order_items;
CREATE POLICY "Authenticated users can read sales order items" ON sales_order_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create sales order items" ON sales_order_items;
CREATE POLICY "Authenticated users can create sales order items" ON sales_order_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update sales order items" ON sales_order_items;
CREATE POLICY "Authenticated users can update sales order items" ON sales_order_items
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Purchase orders table
DROP POLICY IF EXISTS "Authenticated users can read purchase orders" ON purchase_orders;
CREATE POLICY "Authenticated users can read purchase orders" ON purchase_orders
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create purchase orders" ON purchase_orders;
CREATE POLICY "Authenticated users can create purchase orders" ON purchase_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update purchase orders" ON purchase_orders;
CREATE POLICY "Authenticated users can update purchase orders" ON purchase_orders
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Purchase order items table
DROP POLICY IF EXISTS "Authenticated users can read purchase order items" ON purchase_order_items;
CREATE POLICY "Authenticated users can read purchase order items" ON purchase_order_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create purchase order items" ON purchase_order_items;
CREATE POLICY "Authenticated users can create purchase order items" ON purchase_order_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update purchase order items" ON purchase_order_items;
CREATE POLICY "Authenticated users can update purchase order items" ON purchase_order_items
  FOR UPDATE USING (auth.role() = 'authenticated');

-- PO receive items table
DROP POLICY IF EXISTS "Authenticated users can read po_receive_items" ON po_receive_items;
CREATE POLICY "Authenticated users can read po_receive_items" ON po_receive_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create po_receive_items" ON po_receive_items;
CREATE POLICY "Authenticated users can create po_receive_items" ON po_receive_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update po_receive_items" ON po_receive_items;
CREATE POLICY "Authenticated users can update po_receive_items" ON po_receive_items
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete po_receive_items" ON po_receive_items;
CREATE POLICY "Authenticated users can delete po_receive_items" ON po_receive_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- Invoices table
DROP POLICY IF EXISTS "Authenticated users can read invoices" ON invoices;
CREATE POLICY "Authenticated users can read invoices" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create invoices" ON invoices;
CREATE POLICY "Authenticated users can create invoices" ON invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update invoices" ON invoices;
CREATE POLICY "Authenticated users can update invoices" ON invoices
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Payments table
DROP POLICY IF EXISTS "Authenticated users can read payments" ON payments;
CREATE POLICY "Authenticated users can read payments" ON payments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create payments" ON payments;
CREATE POLICY "Authenticated users can create payments" ON payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update payments" ON payments;
CREATE POLICY "Authenticated users can update payments" ON payments
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Payment items table
DROP POLICY IF EXISTS "Authenticated users can read payment_items" ON payment_items;
CREATE POLICY "Authenticated users can read payment_items" ON payment_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create payment_items" ON payment_items;
CREATE POLICY "Authenticated users can create payment_items" ON payment_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update payment_items" ON payment_items;
CREATE POLICY "Authenticated users can update payment_items" ON payment_items
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Delivery notes table
DROP POLICY IF EXISTS "Authenticated users can read delivery_notes" ON delivery_notes;
CREATE POLICY "Authenticated users can read delivery_notes" ON delivery_notes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create delivery_notes" ON delivery_notes;
CREATE POLICY "Authenticated users can create delivery_notes" ON delivery_notes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update delivery_notes" ON delivery_notes;
CREATE POLICY "Authenticated users can update delivery_notes" ON delivery_notes
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Purchasing reminders table
DROP POLICY IF EXISTS "Authenticated users can read purchasing_reminders" ON purchasing_reminders;
CREATE POLICY "Authenticated users can read purchasing_reminders" ON purchasing_reminders
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create purchasing_reminders" ON purchasing_reminders;
CREATE POLICY "Authenticated users can create purchasing_reminders" ON purchasing_reminders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update purchasing_reminders" ON purchasing_reminders;
CREATE POLICY "Authenticated users can update purchasing_reminders" ON purchasing_reminders
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Company settings table
DROP POLICY IF EXISTS "Authenticated users can read company_settings" ON company_settings;
CREATE POLICY "Authenticated users can read company_settings" ON company_settings
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create company_settings" ON company_settings;
CREATE POLICY "Authenticated users can create company_settings" ON company_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update company_settings" ON company_settings;
CREATE POLICY "Authenticated users can update company_settings" ON company_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Customer SKU lock table
DROP POLICY IF EXISTS "Authenticated users can read customer_sku_lock" ON customer_sku_lock;
CREATE POLICY "Authenticated users can read customer_sku_lock" ON customer_sku_lock
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create customer_sku_lock" ON customer_sku_lock;
CREATE POLICY "Authenticated users can create customer_sku_lock" ON customer_sku_lock
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update customer_sku_lock" ON customer_sku_lock;
CREATE POLICY "Authenticated users can update customer_sku_lock" ON customer_sku_lock
  FOR UPDATE USING (auth.role() = 'authenticated');
