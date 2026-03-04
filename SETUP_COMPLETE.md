# Complete Setup Instructions

## Step 1: Create Tables in Supabase

1. Go to your Supabase Dashboard
2. Click "SQL Editor" on the left sidebar
3. Click "New Query"
4. Copy and paste the SQL from `SUPABASE_SETUP.md`
5. Click "Run"

## Step 2: Set Up RLS Policies

1. In SQL Editor, click "New Query"
2. Copy and paste the SQL from `RLS_POLICIES.sql`
3. Click "Run"

## Step 3: Create a Test User

1. Go to Authentication → Users in Supabase Dashboard
2. Click "Add user"
3. Enter:
   - Email: `test@example.com`
   - Password: `Test123456!`
4. Click "Create user"

## Step 4: Configure Environment

Your `.env` should already have:
```
VITE_SUPABASE_URL=https://aebzmqnuonymevvgqczu.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_vCICDtccRwN54r2LDXGc9w_EX-JOtoo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=5000
NODE_ENV=development
```

## Step 5: Install & Run

```bash
npm install
npm run dev
```

## Step 6: Login

- URL: http://localhost:3000
- Email: `test@example.com`
- Password: `Test123456!`

## Troubleshooting

### 406 Error on Login
- Make sure RLS policies are set up correctly
- Check that the user exists in Supabase Auth
- Verify the anon key is correct

### Can't Create Products/Customers
- Check RLS policies are enabled
- Make sure you're logged in
- Verify the table exists in Supabase

### Connection Issues
- Check your Supabase URL and keys in `.env`
- Make sure Supabase project is active
- Check browser console for detailed errors

## What's Working

✅ Authentication (Login/Logout)
✅ Products (Create, Read)
✅ Customers (Create, Read)
✅ Suppliers (Create, Read)
✅ Sales Orders (Read)
✅ Invoices (Read)
✅ Reports (AR/AP Aging)
✅ Dashboard with real-time stats

## Architecture

- **Frontend**: React + Supabase JS Client
- **Backend**: Node.js + Express (optional, for complex logic)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth
- **UI**: Tailwind CSS

## Next Steps

1. Add Update/Delete operations
2. Implement real-time subscriptions
3. Add file uploads
4. Create advanced filtering
5. Set up role-based access control
6. Add notifications
