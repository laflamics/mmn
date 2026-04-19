import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadDocument } from '../lib/storage';
import { formatCurrency } from '../lib/formatters';
import Dialog from './Dialog';
import NumberInput from './NumberInput';

export default function RecordCustomerPaymentDialog({ isOpen, onClose, onSubmit, customer }) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [transferProofUrl, setTransferProofUrl] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('id, name')
        .order('name');
      if (err) throw err;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleTransferProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError('');
      const { url } = await uploadDocument(file);
      setTransferProofUrl(url);
    } catch (err) {
      setError('Failed to upload transfer proof: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      if (!paidAmount || paidAmount <= 0) {
        setError('Paid amount must be greater than 0');
        return;
      }

      if (paidAmount > customer.total_outstanding) {
        setError('Paid amount cannot exceed total outstanding');
        return;
      }

      // Get all unpaid invoices for this customer, sorted by due date (oldest first)
      const invoices = [...customer.invoices].sort((a, b) => 
        new Date(a.due_date) - new Date(b.due_date)
      );

      let remainingPayment = parseFloat(paidAmount);
      const updatedInvoices = [];

      // Distribute payment to invoices (FIFO - oldest first)
      for (const invoice of invoices) {
        if (remainingPayment <= 0) break;

        const invoiceOutstanding = invoice.outstanding;
        const paymentForThisInvoice = Math.min(remainingPayment, invoiceOutstanding);
        
        const newPaidAmount = (invoice.paid_amount || 0) + paymentForThisInvoice;
        const newOutstanding = invoice.total_amount - newPaidAmount;
        
        // Determine new status
        let newStatus = 'unpaid';
        if (newOutstanding <= 0) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }

        // Update invoice
        const { error: updateErr } = await supabase
          .from('invoices')
          .update({
            paid_amount: newPaidAmount,
            status: newStatus,
            payment_proof_url: transferProofUrl || invoice.payment_proof_url || null,
            last_payment_date: paymentDate
          })
          .eq('id', invoice.id);

        if (updateErr) throw updateErr;

        updatedInvoices.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          payment_amount: paymentForThisInvoice
        });

        remainingPayment -= paymentForThisInvoice;
      }

      // Log payment summary (optional - bisa disimpan ke table terpisah kalo mau)
      console.log('Payment distributed:', {
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
        total_payment: paidAmount,
        payment_date: paymentDate,
        received_by: receivedBy,
        invoices_paid: updatedInvoices,
        notes: notes
      });

      setError('');
      alert(`Payment recorded successfully!\n\nTotal: ${formatCurrency(paidAmount)}\nDistributed to ${updatedInvoices.length} invoice(s)`);
      
      // Reset form
      setPaidAmount(0);
      setTransferProofUrl('');
      setReceivedBy('');
      setNotes('');
      
      onSubmit();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!customer) return null;

  const newOutstanding = customer.total_outstanding - (parseFloat(paidAmount) || 0);

  return (
    <Dialog
      isOpen={isOpen}
      title={`Record Payment - ${customer.customer_name}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Confirm Payment"
      isLoading={loading}
    >
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Customer Info */}
        <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400">Customer</p>
              <p className="text-white font-semibold">{customer.customer_name}</p>
              <p className="text-slate-400 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  customer.customer_type === 'B2B' ? 'bg-blue-500/30 text-blue-200' : 'bg-green-500/30 text-green-200'
                }`}>
                  {customer.customer_type}
                </span>
              </p>
            </div>
            <div>
              <p className="text-slate-400">Total Outstanding</p>
              <p className="text-orange-400 font-bold text-lg">{formatCurrency(customer.total_outstanding)}</p>
              <p className="text-slate-400 mt-1">{customer.total_invoices} unpaid invoices</p>
            </div>
          </div>
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Payment Date</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
          />
        </div>

        {/* Paid Amount */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Amount to Pay</label>
          <NumberInput
            value={paidAmount}
            onChange={(val) => setPaidAmount(parseFloat(val) || 0)}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
            placeholder="0"
            allowDecimal={true}
            max={customer.total_outstanding}
          />
          <p className="text-xs text-slate-400 mt-1">Max: {formatCurrency(customer.total_outstanding)}</p>
        </div>

        {/* Remaining After Payment */}
        <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
          <p className="text-xs text-slate-400">Outstanding After Payment</p>
          <p className={`text-xl font-semibold ${newOutstanding === 0 ? 'text-green-400' : 'text-orange-400'}`}>
            {formatCurrency(newOutstanding)}
          </p>
          {newOutstanding === 0 && (
            <p className="text-xs text-green-300 mt-1">✓ All invoices will be fully paid</p>
          )}
          {newOutstanding > 0 && (
            <p className="text-xs text-orange-300 mt-1">⚠️ Remaining balance: {formatCurrency(newOutstanding)}</p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            💡 Payment will be applied to oldest invoices first
          </p>
        </div>

        {/* Received By */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Received By</label>
          <input
            type="text"
            list="users-list"
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
            placeholder="Type name or select from list..."
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
          />
          <datalist id="users-list">
            {users.map(user => (
              <option key={user.id} value={user.name} />
            ))}
          </datalist>
          <p className="text-xs text-slate-500 mt-1">💡 You can type manually (e.g., driver name) or select from list</p>
        </div>

        {/* Transfer Proof Upload */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Transfer Proof (Optional)</label>
          <input
            type="file"
            onChange={handleTransferProofUpload}
            disabled={uploading}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white text-xs"
            accept="image/*,.pdf"
          />
          {transferProofUrl && <p className="text-xs text-green-400 mt-1">✓ Transfer proof uploaded</p>}
          {uploading && <p className="text-xs text-blue-400 mt-1">Uploading...</p>}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
            placeholder="Add payment notes..."
            rows="2"
          />
        </div>
      </div>
    </Dialog>
  );
}
