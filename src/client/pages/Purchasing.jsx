import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Dialog from '../components/Dialog';
import Table from '../components/Table';

export default function Purchasing() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error: err } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(name)
        `)
        .order('order_date', { ascending: false });
      
      if (err) throw err;
      setOrders(data.map(order => ({
        ...order,
        supplier_name: order.suppliers.name
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/30 text-yellow-200',
      confirmed: 'bg-blue-500/30 text-blue-200',
      received: 'bg-green-500/30 text-green-200',
      cancelled: 'bg-red-500/30 text-red-200',
    };
    return colors[status] || 'bg-slate-500/30 text-slate-200';
  };

  const columns = [
    { key: 'po_number', label: 'PO #', width: '12%' },
    { key: 'supplier_name', label: 'Supplier', width: '20%' },
    { 
      key: 'order_date', 
      label: 'Date', 
      width: '15%',
      render: (val) => new Date(val).toLocaleDateString()
    },
    { key: 'total_amount', label: 'Amount', width: '15%', render: (val) => `$${val}` },
    { key: 'paid_amount', label: 'Paid', width: '15%', render: (val) => `$${val || 0}` },
    { 
      key: 'status', 
      label: 'Status', 
      width: '15%',
      render: (val) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(val)}`}>
          {val}
        </span>
      )
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Purchase Orders</h1>
        <button 
          onClick={() => setShowDialog(true)}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Create PO
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      <Dialog
        isOpen={showDialog}
        title="Create New Purchase Order"
        onClose={() => setShowDialog(false)}
        onSubmit={() => setShowDialog(false)}
        submitLabel="Create PO"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Supplier"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="date"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="number"
            placeholder="Amount"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            step="0.01"
          />
        </div>
      </Dialog>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : (
        <Table columns={columns} data={orders} rowsPerPage={20} />
      )}
    </div>
  );
}
