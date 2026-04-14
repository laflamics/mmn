import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cacheManager } from '../lib/cache';
import { formatDate, formatCurrency } from '../lib/formatters';
import FilterBar from '../components/FilterBar';
import Table from '../components/Table';
import Dialog from '../components/Dialog';
import RecordPaymentDialog from '../components/RecordPaymentDialog';
import UploadProofDialog from '../components/UploadProofDialog';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showRecordPaymentDialog, setShowRecordPaymentDialog] = useState(false);
  const [selectedPaymentForRecord, setSelectedPaymentForRecord] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [paymentItems, setPaymentItems] = useState([]);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingPayment, setEditingPayment] = useState(null);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_category: 'supplier',
    supplier_id: '',
    category_type: 'Salary',
    description: '',
    amount: '',
    payment_method: 'Bank Transfer',
    status: 'pending',
    reference_number: ''
  });

  useEffect(() => {
    fetchPayments();
    
    return () => {
      cacheManager.clearAll();
    };
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error: err } = await supabase
        .from('payments')
        .select(`
          *,
          suppliers(name)
        `)
        .order('payment_date', { ascending: false });
      
      if (err) throw err;
      setPayments(data.map(payment => ({
        ...payment,
        supplier_name: payment.suppliers?.name || payment.category_type || 'Unknown'
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewItems = async (payment) => {
    try {
      const { data, error: err } = await supabase
        .from('payment_items')
        .select('*')
        .eq('payment_id', payment.id);

      if (err) throw err;
      setPaymentItems(data);
      setSelectedPayment(payment);
      setShowItemsModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditClick = (payment) => {
    setEditingPayment(payment);
    setFormData({
      payment_date: payment.payment_date,
      payment_category: payment.payment_type === 'ap' ? 'supplier' : 'operational',
      supplier_id: payment.supplier_id || '',
      category_type: payment.category_type || 'Operational',
      description: payment.notes || '',
      amount: payment.amount,
      payment_method: payment.payment_method,
      status: payment.status,
      reference_number: payment.reference_number
    });
    setShowDialog(true);
  };

  const handleRecordPaymentClick = (payment) => {
    setSelectedPaymentForRecord(payment);
    setShowRecordPaymentDialog(true);
  };

  const handleRecordPaymentSubmit = () => {
    setShowRecordPaymentDialog(false);
    setSelectedPaymentForRecord(null);
    fetchPayments();
  };

  const handleDeleteClick = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) {
      return;
    }

    try {
      setError('');

      // First, try to delete payment items
      const { error: itemsErr } = await supabase
        .from('payment_items')
        .delete()
        .eq('payment_id', paymentId);
      
      if (itemsErr) {
        setError(`Failed to delete payment items: ${itemsErr.message}`);
        return;
      }

      // Then delete the payment
      const { error: deleteErr } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);
      
      if (deleteErr) {
        setError(`Failed to delete payment: ${deleteErr.message}`);
        return;
      }

      setError('');
      alert('Payment deleted successfully!');
      await fetchPayments();
    } catch (err) {
      setError(err.message || 'Failed to delete payment');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.amount || !formData.payment_date) {
        setError('Please fill in all required fields');
        return;
      }

      const paymentData = {
        payment_date: formData.payment_date,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        status: formData.status,
        reference_number: formData.reference_number,
        category_type: formData.category_type,
        notes: formData.description
      };

      if (formData.payment_category === 'supplier') {
        paymentData.payment_type = 'ap';
        paymentData.supplier_id = formData.supplier_id || null;
      } else {
        paymentData.payment_type = 'operational';
        paymentData.invoice_id = null;
      }

      if (editingPayment) {
        const { error: updateErr } = await supabase
          .from('payments')
          .update(paymentData)
          .eq('id', editingPayment.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('payments')
          .insert({
            invoice_id: null,
            ...paymentData
          });

        if (insertErr) throw insertErr;
      }

      setError('');
      setShowDialog(false);
      setEditingPayment(null);
      setFormData({
        payment_date: new Date().toISOString().split('T')[0],
        payment_category: 'supplier',
        supplier_id: '',
        category_type: 'Salary',
        description: '',
        amount: '',
        payment_method: 'Bank Transfer',
        status: 'pending',
        reference_number: ''
      });
      fetchPayments();
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = [
    { key: 'reference_number', label: 'Ref #', width: '8%' },
    { key: 'supplier_name', label: 'Supplier/Category', width: '15%' },
    { 
      key: 'payment_date', 
      label: 'Payment Date', 
      width: '10%',
      render: (val) => formatDate(val)
    },
    { key: 'amount', label: 'Amount', width: '10%', render: (val) => formatCurrency(val) },
    { key: 'discount', label: 'Discount', width: '8%', render: (val) => formatCurrency(val || 0) },
    { 
      key: 'paid_amount', 
      label: 'Paid', 
      width: '10%', 
      render: (val) => formatCurrency(val || 0)
    },
    { key: 'payment_method', label: 'Method', width: '8%' },
    { 
      key: 'payment_type', 
      label: 'Type', 
      width: '7%',
      render: (val) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          val === 'ap' ? 'bg-purple-500/30 text-purple-200' : 'bg-blue-500/30 text-blue-200'
        }`}>
          {val === 'ap' ? 'AP' : 'Ops'}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '8%', 
      render: (val) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          val === 'completed' ? 'bg-green-500/30 text-green-200' :
          val === 'pending' ? 'bg-yellow-500/30 text-yellow-200' :
          'bg-red-500/30 text-red-200'
        }`}>
          {val}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '18%',
      render: (_, row) => (
        <div className="flex gap-1 flex-col">
          {row.payment_type === 'ap' && (
            <button
              onClick={() => handleViewItems(row)}
              className="px-2 py-1 text-xs bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded transition-smooth font-medium"
            >
              View
            </button>
          )}
          {row.status === 'pending' && (
            <button
              onClick={() => handleRecordPaymentClick(row)}
              className="px-2 py-1 text-xs bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded transition-smooth font-medium"
            >
              Record
            </button>
          )}
          <button
            onClick={() => handleEditClick(row)}
            className="px-2 py-1 text-xs bg-cyan-500/30 text-cyan-200 hover:bg-cyan-500/50 rounded transition-smooth font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteClick(row.id)}
            className="px-2 py-1 text-xs bg-red-500/30 text-red-200 hover:bg-red-500/50 rounded transition-smooth font-medium"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Payments</h1>
        <button 
          onClick={() => {
            setEditingPayment(null);
            setFormData({
              payment_date: new Date().toISOString().split('T')[0],
              payment_category: 'supplier',
              supplier_id: '',
              category_type: 'Salary',
              description: '',
              amount: '',
              payment_method: 'Bank Transfer',
              status: 'pending',
              reference_number: ''
            });
            setShowDialog(true);
          }}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Create Payment
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      <FilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customerTypeFilter="all"
        setCustomerTypeFilter={() => {}}
        pageSize={pageSize}
        setPageSize={setPageSize}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        searchPlaceholder="Invoice # or Customer"
      />

      <Dialog
        isOpen={showDialog}
        title={editingPayment ? "Edit Payment" : "Create Payment"}
        onClose={() => {
          setShowDialog(false);
          setEditingPayment(null);
        }}
        onSubmit={handleSubmit}
        submitLabel={editingPayment ? "Update Payment" : "Create Payment"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Payment Category</label>
            <select 
              value={formData.payment_category}
              onChange={(e) => setFormData({...formData, payment_category: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option className="bg-slate-800" value="supplier">Supplier (AP)</option>
              <option className="bg-slate-800" value="operational">Operational</option>
            </select>
          </div>

          {formData.payment_category === 'operational' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Category Type</label>
              <select 
                value={formData.category_type}
                onChange={(e) => setFormData({...formData, category_type: e.target.value})}
                className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option className="bg-slate-800">Salary</option>
                <option className="bg-slate-800">Logistics</option>
                <option className="bg-slate-800">Labor</option>
                <option className="bg-slate-800">Electricity</option>
                <option className="bg-slate-800">Operational</option>
                <option className="bg-slate-800">Petty Cash</option>
                <option className="bg-slate-800">Other</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Payment Date</label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Amount</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="0.00"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Payment Method</label>
            <select 
              value={formData.payment_method}
              onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option className="bg-slate-800">Bank Transfer</option>
              <option className="bg-slate-800">Cash</option>
              <option className="bg-slate-800">Check</option>
              <option className="bg-slate-800">Credit Card</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option className="bg-slate-800">pending</option>
              <option className="bg-slate-800">completed</option>
              <option className="bg-slate-800">cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Reference Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="PO, Invoice, or Reference #"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Description/Notes</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Add notes or description..."
              rows="3"
            />
          </div>
        </form>
      </Dialog>

      <RecordPaymentDialog
        isOpen={showRecordPaymentDialog}
        onClose={() => setShowRecordPaymentDialog(false)}
        onSubmit={handleRecordPaymentSubmit}
        payment={selectedPaymentForRecord}
      />

      {/* Payment Items Modal */}
      {showItemsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Payment Details</h2>
                <p className="text-xs text-slate-400 mt-1">PO: {selectedPayment.reference_number} | Supplier: {selectedPayment.supplier_name}</p>
              </div>
              <button
                onClick={() => setShowItemsModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Payment Summary */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400">Payment Date</p>
                <p className="text-white font-semibold">{formatDate(selectedPayment.payment_date)}</p>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400">Payment Method</p>
                <p className="text-white font-semibold">{selectedPayment.payment_method}</p>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400">Status</p>
                <p className={`font-semibold ${
                  selectedPayment.status === 'completed' ? 'text-green-400' :
                  selectedPayment.status === 'pending' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>{selectedPayment.status}</p>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400">Type</p>
                <p className="text-white font-semibold">{selectedPayment.payment_type === 'ap' ? 'AP (Supplier)' : 'Operational'}</p>
              </div>
            </div>

            {/* Items Table */}
            {paymentItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-3">Items Received</h3>
                <div className="space-y-3">
                  {paymentItems.map((item, idx) => (
                    <div key={idx} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-400">Product</p>
                          <p className="text-white font-medium">{item.product_name}</p>
                          <p className="text-xs text-slate-400 mt-1">SKU: {item.product_sku}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Unit Price</p>
                          <p className="text-white font-medium">{formatCurrency(item.unit_price)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        <div>
                          <p className="text-slate-400">Ordered</p>
                          <p className="text-white font-semibold">{item.quantity_ordered}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Received</p>
                          <p className="text-blue-400 font-semibold">{item.quantity_received}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Diff</p>
                          <p className={`font-semibold ${item.quantity_received > item.quantity_ordered ? 'text-orange-400' : item.quantity_received < item.quantity_ordered ? 'text-red-400' : 'text-green-400'}`}>
                            {item.quantity_received - item.quantity_ordered > 0 ? '+' : ''}{item.quantity_received - item.quantity_ordered}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-400">Total Price</p>
                          <p className="text-green-400 font-semibold">{formatCurrency(item.total_price)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Summary */}
            <div className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 p-4 rounded-lg border border-slate-600 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-slate-400 text-sm">Total Items</p>
                  <p className="text-white font-semibold">{paymentItems.length} items</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Total Quantity Received</p>
                  <p className="text-blue-400 font-semibold">{paymentItems.reduce((sum, item) => sum + item.quantity_received, 0)} units</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Total Payment Amount</p>
                  <p className="text-green-400 font-bold text-lg">{formatCurrency(selectedPayment.amount)}</p>
                </div>
              </div>
            </div>

            {selectedPayment.notes && (
              <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 mb-6">
                <p className="text-xs text-slate-400">Notes</p>
                <p className="text-white text-sm mt-1">{selectedPayment.notes}</p>
              </div>
            )}

            <button
              onClick={() => setShowItemsModal(false)}
              className="w-full px-4 py-2 bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded-lg transition-smooth font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

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
