import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { clearOldStorage } from './lib/clearStorage';
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
import ARSummary from './pages/ARSummary';
import ARaging from './pages/ARaging';
import APaging from './pages/APaging';
import Reports from './pages/Reports';
import Savings from './pages/Savings';
import Waste from './pages/Waste';
import Users from './pages/Users';
import Settings from './pages/Settings';
import DatabaseServer from './pages/DatabaseServer';
import Backup from './pages/Backup';

export default function App() {
  const { user, loading, initializeAuth } = useAuthStore();

  useEffect(() => {
    clearOldStorage();
    initializeAuth();
  }, [initializeAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-cyan-300 mt-4 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

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
                <Route path="/ar-summary" element={<ARSummary />} />
                <Route path="/ar-aging" element={<ARaging />} />
                <Route path="/ap-aging" element={<APaging />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/savings" element={<Savings />} />
                <Route path="/waste" element={<Waste />} />
                <Route path="/users" element={<Users />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/database-server" element={<DatabaseServer />} />
                <Route path="/backup" element={<Backup />} />
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
