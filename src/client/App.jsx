import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Purchasing from './pages/Purchasing';
import Warehouse from './pages/Warehouse';
import Returns from './pages/Returns';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import ARaging from './pages/ARaging';
import APaging from './pages/APaging';
import Reports from './pages/Reports';
import Savings from './pages/Savings';
import Waste from './pages/Waste';
import Users from './pages/Users';
import Settings from './pages/Settings';

export default function App() {
  const { user, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          user ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/purchasing" element={<Purchasing />} />
                <Route path="/warehouse" element={<Warehouse />} />
                <Route path="/returns" element={<Returns />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/ar-aging" element={<ARaging />} />
                <Route path="/ap-aging" element={<APaging />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/savings" element={<Savings />} />
                <Route path="/waste" element={<Waste />} />
                <Route path="/users" element={<Users />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}
