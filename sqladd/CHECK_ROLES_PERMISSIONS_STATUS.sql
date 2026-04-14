-- Check current status of roles and permissions tables

-- Check if roles table exists and has data
SELECT 'roles table' as table_name, COUNT(*) as row_count FROM roles;

-- Check if permissions table exists and has data
SELECT 'permissions table' as table_name, COUNT(*) as row_count FROM permissions;

-- Check if user_permissions table exists and has data
SELECT 'user_permissions table' as table_name, COUNT(*) as row_count FROM user_permissions;

-- Check RLS status on roles
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'roles';

-- Check RLS status on permissions
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'permissions';

-- Check RLS status on user_permissions
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_permissions';

-- Check existing policies on roles
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'roles';

-- Check existing policies on permissions
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'permissions';

-- Check existing policies on user_permissions
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'user_permissions';
