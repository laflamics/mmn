import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    setSidebarOpen(false);
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
    { label: 'Database', path: '/database-server', icon: '🗄️' },
    { label: 'Backup', path: '/backup', icon: '💾' },
  ];

  return (
    <div className={`flex h-screen bg-gradient-to-br ${currentTheme.bg}`}>
      {/* Backdrop for desktop when sidebar open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-72 md:w-64' : 'w-0 md:w-20'
        } glass-lg transition-all duration-300 border-r ${currentTheme.border} overflow-y-auto fixed md:relative h-screen z-40 flex flex-col`}
      >
        <div className={`px-4 md:px-6 py-0.5 flex items-center justify-center sticky top-0 bg-gradient-to-b ${currentTheme.bg.split(' ')[0]} to-transparent`}>
          {sidebarOpen && (
            <img src="/mmn.png" alt="MMN Logo" className="h-32 md:h-36 object-contain" />
          )}
          {!sidebarOpen && (
            <img src="/mmn.png" alt="MMN Logo" className="h-24 md:h-28 object-contain" />
          )}
        </div>

        <nav className="mt-4 md:mt-8 space-y-1 px-2 md:px-4 pb-8 flex-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={`flex items-center space-x-3 px-3 md:px-4 py-2 rounded-lg ${currentTheme.textMuted} ${currentTheme.text} ${currentTheme.hover} transition-smooth group text-xs md:text-sm`}
            >
              <span className="text-lg md:text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
              {sidebarOpen && <span className="text-xs md:text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 h-screen w-64 glass-lg border-r border-cyan-500/20 overflow-y-auto z-50 md:hidden flex flex-col">
            <div className="px-4 py-2 flex items-center justify-between sticky top-0 bg-gradient-to-b from-slate-900 to-transparent">
              <img src="/mmn.png" alt="MMN Logo" className="h-20 object-contain" />
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300"
              >
                ✕
              </button>
            </div>

            <nav className="mt-2 space-y-1 px-2 pb-8 flex-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg ${currentTheme.textMuted} ${currentTheme.text} ${currentTheme.hover} transition-smooth group text-xs`}
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <header className={`glass-sm border-b ${currentTheme.border}`}>
          <div className="px-2 sm:px-3 md:px-4 lg:px-8 py-2 sm:py-2.5 md:py-3 lg:py-4 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-smooth"
                title="Toggle sidebar"
              >
                {sidebarOpen ? '◀' : '▶'}
              </button>
              <h2 className={`text-xs sm:text-sm md:text-base lg:text-lg font-semibold ${currentTheme.text} truncate`}>
                Welcome, <span className="gradient-text">{user?.name}</span>
              </h2>
            </div>
            <button
              onClick={handleLogout}
              className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-smooth font-medium text-xs sm:text-xs md:text-sm whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-2 sm:p-3 md:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
