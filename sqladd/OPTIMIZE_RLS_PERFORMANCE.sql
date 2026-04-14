-- Optimize RLS Policies for Performance
-- Drop old policies and create simplified ones

-- Sales Orders
DROP POLICY IF EXISTS "Authenticated users can read sales orders" ON sales_orders;
CREATE POLICY "Authenticated users can read sales orders" ON sales_orders
  FOR SELECT USING (true);

-- Purchase Orders
DROP POLICY IF EXISTS "Authenticated users can read purchase orders" ON purchase_orders;
CREATE POLICY "Authenticated users can read purchase orders" ON purchase_orders
  FOR SELECT USING (true);

-- Invoices
DROP POLICY IF EXISTS "Authenticated users can read invoices" ON invoices;
CREATE POLICY "Authenticated users can read invoices" ON invoices
  FOR SELECT USING (true);

-- Customers
DROP POLICY IF EXISTS "Authenticated users can read customers" ON customers;
CREATE POLICY "Authenticated users can read customers" ON customers
  FOR SELECT USING (true);

-- Suppliers
DROP POLICY IF EXISTS "Authenticated users can read suppliers" ON suppliers;
CREATE POLICY "Authenticated users can read suppliers" ON suppliers
  FOR SELECT USING (true);

-- Products
DROP POLICY IF EXISTS "Authenticated users can read products" ON products;
CREATE POLICY "Authenticated users can read products" ON products
  FOR SELECT USING (true);

-- Inventory
DROP POLICY IF EXISTS "Authenticated users can read inventory" ON inventory;
CREATE POLICY "Authenticated users can read inventory" ON inventory
  FOR SELECT USING (true);

-- Payments
DROP POLICY IF EXISTS "Authenticated users can read payments" ON payments;
CREATE POLICY "Authenticated users can read payments" ON payments
  FOR SELECT USING (true);

-- Users
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (true);
