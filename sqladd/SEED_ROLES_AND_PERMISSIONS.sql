-- Seed roles and permissions data

-- Insert roles if they don't exist
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrator with full access'),
  ('manager', 'Manager with limited admin access'),
  ('sales', 'Sales representative'),
  ('viewer', 'Read-only viewer')
ON CONFLICT (name) DO NOTHING;

-- Insert permissions if they don't exist
INSERT INTO permissions (module, name, description) VALUES
  ('dashboard', 'view_dashboard', 'View dashboard'),
  ('products', 'view_products', 'View products'),
  ('products', 'create_products', 'Create products'),
  ('products', 'edit_products', 'Edit products'),
  ('products', 'delete_products', 'Delete products'),
  ('customers', 'view_customers', 'View customers'),
  ('customers', 'create_customers', 'Create customers'),
  ('customers', 'edit_customers', 'Edit customers'),
  ('customers', 'delete_customers', 'Delete customers'),
  ('suppliers', 'view_suppliers', 'View suppliers'),
  ('suppliers', 'create_suppliers', 'Create suppliers'),
  ('suppliers', 'edit_suppliers', 'Edit suppliers'),
  ('suppliers', 'delete_suppliers', 'Delete suppliers'),
  ('sales', 'view_sales', 'View sales orders'),
  ('sales', 'create_sales', 'Create sales orders'),
  ('sales', 'edit_sales', 'Edit sales orders'),
  ('sales', 'delete_sales', 'Delete sales orders'),
  ('purchasing', 'view_purchasing', 'View purchase orders'),
  ('purchasing', 'create_purchasing', 'Create purchase orders'),
  ('purchasing', 'edit_purchasing', 'Edit purchase orders'),
  ('purchasing', 'delete_purchasing', 'Delete purchase orders'),
  ('inventory', 'view_inventory', 'View inventory'),
  ('inventory', 'edit_inventory', 'Edit inventory'),
  ('invoices', 'view_invoices', 'View invoices'),
  ('invoices', 'create_invoices', 'Create invoices'),
  ('invoices', 'edit_invoices', 'Edit invoices'),
  ('payments', 'view_payments', 'View payments'),
  ('payments', 'create_payments', 'Create payments'),
  ('payments', 'edit_payments', 'Edit payments'),
  ('users', 'view_users', 'View users'),
  ('users', 'create_users', 'Create users'),
  ('users', 'edit_users', 'Edit users'),
  ('users', 'delete_users', 'Delete users'),
  ('reports', 'view_reports', 'View reports'),
  ('settings', 'view_settings', 'View settings'),
  ('settings', 'edit_settings', 'Edit settings')
ON CONFLICT (module, name) DO NOTHING;
