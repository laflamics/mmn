import { useEffect, useState } from 'react';
import { getInvoices } from '../lib/api';
import Dialog from '../components/Dialog';
import Table from '../components/Table';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    return status === 'paid' ? 'bg-green-500/30 text-green-200' : 'bg-orange-500/30 text-orange-200';
  };

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', width: '12%' },
    { key: 'customer_name', label: 'Customer', width: '18%' },
    { 
      key: 'invoice_date', 
      label: 'Date', 
      width: '12%',
      render: (val) => new Date(val).toLocaleDateString()
    },
    { 
      key: 'due_date', 
      label: 'Due Date', 
      width: '12%',
      render: (val) => new Date(val).toLocaleDateString()
    },
    { key: 'total_amount', label: 'Amount', width: '12%', render: (val) => `$${val}` },
    { key: 'paid_amount', label: 'Paid', width: '12%', render: (val) => `$${val}` },
    { 
      key: 'status', 
      label: 'Status', 
      width: '10%',
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
        <h1 className="text-4xl font-bold gradient-text">Invoices</h1>
        <button 
          onClick={() => setShowDialog(true)}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Create Invoice
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      <Dialog
        isOpen={showDialog}
        title="Create New Invoice"
        onClose={() => setShowDialog(false)}
        onSubmit={() => setShowDialog(false)}
        submitLabel="Create Invoice"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Customer"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="date"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="date"
            placeholder="Due Date"
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
        <Table columns={columns} data={invoices} rowsPerPage={20} />
      )}
    </div>
  );
}
