import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/', icon: '📊' },
    { label: 'Products', path: '/products', icon: '📦' },
    { label: 'Customers', path: '/customers', icon: '👥' },
    { label: 'Suppliers', path: '/suppliers', icon: '🏭' },
    { label: 'Inventory', path: '/inventory', icon: '📦' },
    { label: 'Sales Orders', path: '/sales', icon: '💼' },
    { label: 'Purchase Orders', path: '/purchasing', icon: '🛒' },
    { label: 'Warehouse', path: '/warehouse', icon: '🏢' },
    { label: 'Returns', path: '/returns', icon: '↩️' },
    { label: 'Invoices', path: '/invoices', icon: '📄' },
    { label: 'Payments', path: '/payments', icon: '💳' },
    { label: 'AR Aging', path: '/ar-aging', icon: '📈' },
    { label: 'AP Aging', path: '/ap-aging', icon: '📉' },
    { label: 'Reports', path: '/reports', icon: '📊' },
    { label: 'Savings', path: '/savings', icon: '💰' },
    { label: 'Waste', path: '/waste', icon: '♻️' },
    { label: 'Users', path: '/users', icon: '👤' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  return (
    <div className={`flex h-screen bg-gradient-to-br ${currentTheme.bg}`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} glass-lg transition-smooth duration-300 border-r ${currentTheme.border} overflow-y-auto`}>
        <div className={`p-6 flex items-center justify-between sticky top-0 bg-gradient-to-b ${currentTheme.bg.split(' ')[0]} to-transparent`}>
          {sidebarOpen && (
            <h1 className="text-2xl font-bold gradient-text">ERP</h1>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className={`${currentTheme.hover} p-2 rounded-lg transition-smooth ${currentTheme.text}`}
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        <nav className="mt-8 space-y-1 px-4 pb-8">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-2 rounded-lg ${currentTheme.textMuted} ${currentTheme.text} ${currentTheme.hover} transition-smooth group text-sm`}
            >
              <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className={`glass-sm border-b ${currentTheme.border}`}>
          <div className="px-8 py-4 flex justify-between items-center">
            <h2 className={`text-lg font-semibold ${currentTheme.text}`}>Welcome, <span className="gradient-text">{user?.name}</span></h2>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-smooth font-medium text-sm"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
