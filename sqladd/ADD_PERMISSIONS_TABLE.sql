-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  module VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access'),
  ('manager', 'Manager access - can manage sales, customers, products'),
  ('sales', 'Sales staff - can create and manage sales orders'),
  ('viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, description, module) VALUES
  ('view_dashboard', 'View dashboard', 'dashboard'),
  ('view_sales', 'View sales orders', 'sales'),
  ('create_sales', 'Create sales orders', 'sales'),
  ('edit_sales', 'Edit sales orders', 'sales'),
  ('delete_sales', 'Delete sales orders', 'sales'),
  ('view_customers', 'View customers', 'customers'),
  ('create_customers', 'Create customers', 'customers'),
  ('edit_customers', 'Edit customers', 'customers'),
  ('delete_customers', 'Delete customers', 'customers'),
  ('view_products', 'View products', 'products'),
  ('create_products', 'Create products', 'products'),
  ('edit_products', 'Edit products', 'products'),
  ('delete_products', 'Delete products', 'products'),
  ('view_inventory', 'View inventory', 'inventory'),
  ('view_invoices', 'View invoices', 'invoices'),
  ('view_payments', 'View payments', 'payments'),
  ('view_reports', 'View reports', 'reports'),
  ('manage_users', 'Manage users', 'users'),
  ('manage_settings', 'Manage settings', 'settings')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager: most permissions except user management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'manager' AND p.name NOT IN ('manage_users', 'manage_settings')
ON CONFLICT DO NOTHING;

-- Sales: sales and customer view/create
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'sales' AND p.name IN (
  'view_dashboard', 'view_sales', 'create_sales', 'edit_sales',
  'view_customers', 'view_products', 'view_inventory'
)
ON CONFLICT DO NOTHING;

-- Viewer: read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'viewer' AND p.name LIKE 'view_%'
ON CONFLICT DO NOTHING;

-- Update users table to add role_id and department
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Enable RLS for new tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read roles" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read permissions" ON permissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read role permissions" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, permission_id)
);

-- Enable RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read user permissions" ON user_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage user permissions" ON user_permissions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete user permissions" ON user_permissions
  FOR DELETE USING (auth.role() = 'authenticated');
