-- RLS Policies for ERP System

-- Users table - Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Products - Allow authenticated users to read
CREATE POLICY "Authenticated users can read products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create products" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Customers - Allow authenticated users to read
CREATE POLICY "Authenticated users can read customers" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create customers" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers" ON customers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Suppliers - Allow authenticated users to read
CREATE POLICY "Authenticated users can read suppliers" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create suppliers" ON suppliers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update suppliers" ON suppliers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Inventory - Allow authenticated users to read
CREATE POLICY "Authenticated users can read inventory" ON inventory
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update inventory" ON inventory
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Sales Orders - Allow authenticated users to read
CREATE POLICY "Authenticated users can read sales orders" ON sales_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create sales orders" ON sales_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sales orders" ON sales_orders
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Purchase Orders - Allow authenticated users to read
CREATE POLICY "Authenticated users can read purchase orders" ON purchase_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create purchase orders" ON purchase_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update purchase orders" ON purchase_orders
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Invoices - Allow authenticated users to read
CREATE POLICY "Authenticated users can read invoices" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create invoices" ON invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update invoices" ON invoices
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Payments - Allow authenticated users to read
CREATE POLICY "Authenticated users can read payments" ON payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create payments" ON payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Customer SKU Lock - Allow authenticated users to read
CREATE POLICY "Authenticated users can read customer sku locks" ON customer_sku_lock
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create customer sku locks" ON customer_sku_lock
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
