# Quick Start Guide

## Setup

1. **Install dependencies**
```bash
npm install
```

2. **Verify your `.env` file has:**
```
VITE_SUPABASE_URL=https://aebzmqnuonymevvgqczu.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_vCICDtccRwN54r2LDXGc9w_EX-JOtoo
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=5000
NODE_ENV=development
```

3. **Start the app**
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Login

Use the credentials you created in Supabase:
- Email: your-email@example.com
- Password: your-password

## Architecture

The app now uses **Supabase directly from the frontend** for most operations:
- Authentication via Supabase Auth
- Database queries via Supabase JS client
- No need for backend API calls for CRUD operations

The backend is still available for:
- Complex business logic
- Server-side operations
- Future integrations

## Features Working

✅ Login/Authentication
✅ Products (Create, Read)
✅ Customers (Create, Read)
✅ Suppliers (Create, Read)
✅ Sales Orders (Read)
✅ Invoices (Read)
✅ Reports (AR/AP Aging)
✅ Dashboard with stats

## Next Steps

- Add more CRUD operations (Update, Delete)
- Implement real-time subscriptions
- Add file uploads
- Implement advanced filtering
- Add user roles and permissions
