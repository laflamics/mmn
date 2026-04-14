-- Add RLS policies for roles and permissions tables

-- Enable RLS on roles table if not already enabled
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Authenticated users can read roles" ON roles;
CREATE POLICY "Authenticated users can read roles" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Enable RLS on permissions table if not already enabled
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON permissions;
CREATE POLICY "Authenticated users can read permissions" ON permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Enable RLS on user_permissions table if not already enabled
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
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
