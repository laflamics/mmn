# Elegant ERP System

A modern, elegant, and user-friendly Enterprise Resource Planning (ERP) system built with React, Node.js, and PostgreSQL.

## Features

### Core Modules
- **Product Management** - SKU lock per customer (B2B & B2C)
- **Customer Management** - Plafond (credit limit) tracking
- **Supplier Management** - Plafond and payment tracking
- **Sales Management** - Purchase orders with customer savings
- **Purchasing** - Purchase order management
- **Inventory Management** - Warehouse stock tracking
- **Invoicing** - Invoice generation and tracking
- **Payments** - Payment recording and reconciliation
- **Reports** - AR/AP aging, inventory reports with Excel export
- **User Access Management** - Role-based access control
- **Financial Modules** - AR & AP aging reports

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **State Management**: Zustand
- **HTTP Client**: Axios

## Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd elegant-erp
```

2. Install dependencies
```bash
npm install
```

3. Setup environment variables
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Start the development server
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Project Structure

```
elegant-erp/
├── src/
│   ├── server/
│   │   ├── db/
│   │   │   └── init.js          # Database initialization
│   │   ├── routes/              # API routes
│   │   └── index.js             # Server entry point
│   └── client/
│       ├── components/          # React components
│       ├── pages/               # Page components
│       ├── store/               # Zustand stores
│       ├── App.jsx              # Main app component
│       └── index.jsx            # Client entry point
├── index.html                   # HTML template
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS config
└── package.json                # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server (both frontend & backend)
- `npm run dev:server` - Start backend only
- `npm run dev:client` - Start frontend only
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm start` - Start production server

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create customer
- `PATCH /api/customers/:id/plafond` - Update plafond

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Create supplier
- `PATCH /api/suppliers/:id/plafond` - Update plafond

### Sales
- `GET /api/sales` - Get all sales orders
- `POST /api/sales` - Create sales order

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create invoice

### Reports
- `GET /api/reports/ar-aging` - AR aging report
- `GET /api/reports/ap-aging` - AP aging report

## Features Roadmap

- [ ] Warehouse & Delivery management
- [ ] Return management
- [ ] Waste management
- [ ] Advanced inventory forecasting
- [ ] Multi-currency support
- [ ] Mobile app
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard

## License

MIT
