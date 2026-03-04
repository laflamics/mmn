import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Dialog from '../components/Dialog';
import Table from '../components/Table';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error: err } = await supabase
        .from('payments')
        .select(`
          *,
          invoices(invoice_number, customers(name))
        `)
        .order('payment_date', { ascending: false });
      
      if (err) throw err;
      setPayments(data.map(payment => ({
        ...payment,
        invoice_number: payment.invoices.invoice_number,
        customer_name: payment.invoices.customers.name
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', width: '15%' },
    { key: 'customer_name', label: 'Customer', width: '20%' },
    { 
      key: 'payment_date', 
      label: 'Payment Date', 
      width: '15%',
      render: (val) => new Date(val).toLocaleDateString()
    },
    { key: 'amount', label: 'Amount', width: '15%', render: (val) => `$${val}` },
    { key: 'payment_method', label: 'Method', width: '15%' },
    { key: 'reference_number', label: 'Reference', width: '15%' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Payments</h1>
        <button 
          onClick={() => setShowDialog(true)}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Record Payment
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      <Dialog
        isOpen={showDialog}
        title="Record New Payment"
        onClose={() => setShowDialog(false)}
        onSubmit={() => setShowDialog(false)}
        submitLabel="Record Payment"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Invoice #"
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
          <select className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option className="bg-slate-800">Bank Transfer</option>
            <option className="bg-slate-800">Cash</option>
            <option className="bg-slate-800">Check</option>
            <option className="bg-slate-800">Credit Card</option>
          </select>
          <input
            type="text"
            placeholder="Reference Number"
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </Dialog>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : (
        <Table columns={columns} data={payments} rowsPerPage={20} />
      )}
    </div>
  );
}
