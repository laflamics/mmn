-- Fix RLS policies to allow authenticated users to manage data
-- Drop all old policies first

DROP POLICY IF EXISTS "Authenticated users can read products" ON products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

DROP POLICY IF EXISTS "Authenticated users can read customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON customers;

DROP POLICY IF EXISTS "Authenticated users can read suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can create suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can delete suppliers" ON suppliers;

DROP POLICY IF EXISTS "Authenticated users can read inventory" ON inventory;
DROP POLICY IF EXISTS "Authenticated users can update inventory" ON inventory;
DROP POLICY IF EXISTS "Authenticated users can insert inventory" ON inventory;

DROP POLICY IF EXISTS "Authenticated users can read sales orders" ON sales_orders;
DROP POLICY IF EXISTS "Authenticated users can create sales orders" ON sales_orders;
DROP POLICY IF EXISTS "Authenticated users can update sales orders" ON sales_orders;
DROP POLICY IF EXISTS "Authenticated users can delete sales orders" ON sales_orders;

DROP POLICY IF EXISTS "Authenticated users can read sales order items" ON sales_order_items;
DROP POLICY IF EXISTS "Authenticated users can create sales order items" ON sales_order_items;
DROP POLICY IF EXISTS "Authenticated users can update sales order items" ON sales_order_items;
DROP POLICY IF EXISTS "Authenticated users can delete sales order items" ON sales_order_items;

DROP POLICY IF EXISTS "Authenticated users can read purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can create purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can update purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can delete purchase orders" ON purchase_orders;

DROP POLICY IF EXISTS "Authenticated users can read invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON invoices;

DROP POLICY IF EXISTS "Authenticated users can read payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON payments;

DROP POLICY IF EXISTS "Authenticated users can read customer sku locks" ON customer_sku_lock;
DROP POLICY IF EXISTS "Authenticated users can create customer sku locks" ON customer_sku_lock;
DROP POLICY IF EXISTS "Authenticated users can update customer sku locks" ON customer_sku_lock;

DROP POLICY IF EXISTS "Authenticated users can read user permissions" ON user_permissions;
DROP POLICY IF EXISTS "Authenticated users can create user permissions" ON user_permissions;
DROP POLICY IF EXISTS "Authenticated users can delete user permissions" ON user_permissions;

-- Now create new policies

-- Products table
CREATE POLICY "Authenticated users can read products" ON products
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create products" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update products" ON products
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can delete products" ON products
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Customers table
CREATE POLICY "Authenticated users can read customers" ON customers
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create customers" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update customers" ON customers
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can delete customers" ON customers
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Suppliers table
CREATE POLICY "Authenticated users can read suppliers" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create suppliers" ON suppliers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update suppliers" ON suppliers
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can delete suppliers" ON suppliers
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Inventory table
CREATE POLICY "Authenticated users can read inventory" ON inventory
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update inventory" ON inventory
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can insert inventory" ON inventory
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Sales Orders table
CREATE POLICY "Authenticated users can read sales orders" ON sales_orders
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create sales orders" ON sales_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update sales orders" ON sales_orders
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can delete sales orders" ON sales_orders
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Sales Order Items table
CREATE POLICY "Authenticated users can read sales order items" ON sales_order_items
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create sales order items" ON sales_order_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update sales order items" ON sales_order_items
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can delete sales order items" ON sales_order_items
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Purchase Orders table
CREATE POLICY "Authenticated users can read purchase orders" ON purchase_orders
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create purchase orders" ON purchase_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update purchase orders" ON purchase_orders
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can delete purchase orders" ON purchase_orders
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Invoices table
CREATE POLICY "Authenticated users can read invoices" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create invoices" ON invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update invoices" ON invoices
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can delete invoices" ON invoices
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Payments table
CREATE POLICY "Authenticated users can read payments" ON payments
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create payments" ON payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update payments" ON payments
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Customer SKU Lock table
CREATE POLICY "Authenticated users can read customer sku locks" ON customer_sku_lock
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create customer sku locks" ON customer_sku_lock
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update customer sku locks" ON customer_sku_lock
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- User Permissions table
CREATE POLICY "Authenticated users can read user permissions" ON user_permissions
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create user permissions" ON user_permissions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can delete user permissions" ON user_permissions
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
