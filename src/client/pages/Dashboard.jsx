import { useEffect, useState } from 'react';
import { getCustomers, getSuppliers, getProducts, getInvoices } from '../lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSuppliers: 0,
    totalProducts: 0,
    pendingInvoices: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [customers, suppliers, products, invoices] = await Promise.all([
          getCustomers(),
          getSuppliers(),
          getProducts(),
          getInvoices(),
        ]);

        setStats({
          totalCustomers: customers.length,
          totalSuppliers: suppliers.length,
          totalProducts: products.length,
          pendingInvoices: invoices.filter(i => i.status === 'unpaid').length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    { label: 'Total Customers', value: stats.totalCustomers, icon: '👥', gradient: 'from-cyan-500 to-blue-500' },
    { label: 'Total Suppliers', value: stats.totalSuppliers, icon: '🏭', gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Total Products', value: stats.totalProducts, icon: '📦', gradient: 'from-violet-500 to-indigo-500' },
    { label: 'Pending Invoices', value: stats.pendingInvoices, icon: '📄', gradient: 'from-orange-500 to-red-500' },
  ];

  return (
    <div>
      <h1 className="text-4xl font-bold gradient-text mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, idx) => (
          <div key={idx} className="glass rounded-xl p-6 hover:glass-lg transition-smooth group cursor-pointer neon-glow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-300/70 text-sm font-medium">{card.label}</p>
                <p className="text-4xl font-bold text-white mt-2 group-hover:scale-110 transition-transform">{card.value}</p>
              </div>
              <div className={`bg-gradient-to-br ${card.gradient} text-white text-3xl p-4 rounded-xl group-hover:scale-110 transition-transform`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full btn-gradient text-white py-3 rounded-lg transition-smooth font-medium">
              Create New Sales Order
            </button>
            <button className="w-full btn-gradient-success text-white py-3 rounded-lg transition-smooth font-medium">
              Create Purchase Order
            </button>
            <button className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white py-3 rounded-lg transition-smooth font-medium">
              Add New Product
            </button>
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 glass-sm rounded-lg">
              <span className="text-cyan-300">Database</span>
              <span className="text-emerald-400 font-semibold text-sm">● Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 glass-sm rounded-lg">
              <span className="text-cyan-300">API Server</span>
              <span className="text-emerald-400 font-semibold text-sm">● Running</span>
            </div>
            <div className="flex items-center justify-between p-3 glass-sm rounded-lg">
              <span className="text-cyan-300">Last Sync</span>
              <span className="text-cyan-400/70 text-sm">Just now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
