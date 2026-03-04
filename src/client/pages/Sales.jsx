import { useEffect, useState } from 'react';
import { getSalesOrders, checkPlafondStatus } from '../lib/api';
import Dialog from '../components/Dialog';
import PlafondStatus from '../components/PlafondStatus';
import Table from '../components/Table';

export default function Sales() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [plafondStatus, setPlafondStatus] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await getSalesOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = async () => {
    setShowDialog(true);
    setSelectedCustomer(null);
    setPlafondStatus(null);
  };

  const handleCustomerSelect = async (customerId) => {
    setSelectedCustomer(customerId);
    try {
      const status = await checkPlafondStatus(customerId);
      setPlafondStatus(status);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/30 text-yellow-200',
      confirmed: 'bg-blue-500/30 text-blue-200',
      shipped: 'bg-purple-500/30 text-purple-200',
      delivered: 'bg-green-500/30 text-green-200',
      cancelled: 'bg-red-500/30 text-red-200',
    };
    return colors[status] || 'bg-slate-500/30 text-slate-200';
  };

  const columns = [
    { key: 'order_number', label: 'Order #', width: '15%' },
    { key: 'customer_name', label: 'Customer', width: '25%' },
    { 
      key: 'order_date', 
      label: 'Date', 
      width: '15%',
      render: (val) => new Date(val).toLocaleDateString()
    },
    { key: 'total_amount', label: 'Amount', width: '15%', render: (val) => `$${val}` },
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
        <h1 className="text-4xl font-bold gradient-text">Sales Orders</h1>
        <button 
          onClick={handleCreateClick}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Create Order
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      <Dialog
        isOpen={showDialog}
        title="Create New Sales Order"
        onClose={() => setShowDialog(false)}
        onSubmit={() => setShowDialog(false)}
        submitLabel={plafondStatus?.isBlocked ? 'Cannot Create - Limit Reached' : 'Create Order'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Customer</label>
            <select
              onChange={(e) => handleCustomerSelect(parseInt(e.target.value))}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select Customer...</option>
              {/* Will be populated from customers API */}
            </select>
          </div>

          {plafondStatus && (
            <PlafondStatus status={plafondStatus} />
          )}

          {!plafondStatus?.isBlocked && (
            <>
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
            </>
          )}
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
