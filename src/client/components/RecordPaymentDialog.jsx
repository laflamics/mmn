import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadDocument } from '../lib/storage';
import { formatCurrency } from '../lib/formatters';
import Dialog from './Dialog';
import NumberInput from './NumberInput';

export default function RecordPaymentDialog({ isOpen, onClose, onSubmit, payment }) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState(payment?.amount - (payment?.paid_amount || 0) || 0);
  const [transferProofUrl, setTransferProofUrl] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError('');
      const { url } = await uploadDocument(file);
      setInvoiceUrl(url);
    } catch (err) {
      setError('Failed to upload invoice: ' + err.message);
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

      const remainingAfterPayment = (payment.amount - (payment.paid_amount || 0)) - parseFloat(paidAmount);
      
      if (remainingAfterPayment < 0) {
        setError('Paid amount cannot exceed remaining balance');
        return;
      }

      // Calculate new status
      const newStatus = remainingAfterPayment === 0 ? 'completed' : 'pending';

      // Update payment with paid amount
      const { error: updateErr } = await supabase
        .from('payments')
        .update({
          paid_amount: (payment.paid_amount || 0) + parseFloat(paidAmount),
          status: newStatus,
          payment_proof_url: transferProofUrl || null,
          invoice_url: invoiceUrl || null
        })
        .eq('id', payment.id);

      if (updateErr) throw updateErr;

      setError('');
      onSubmit();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!payment) return null;

  const remainingAmount = payment.amount - (payment.paid_amount || 0);
  const newRemaining = remainingAmount - parseFloat(paidAmount || 0);

  return (
    <Dialog
      isOpen={isOpen}
      title={`Record Payment - ${payment.reference_number}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Confirm Payment"
    >
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Payment Info */}
        <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400">Supplier/Category</p>
              <p className="text-white font-semibold">{payment.supplier_name}</p>
            </div>
            <div>
              <p className="text-slate-400">Total Amount</p>
              <p className="text-green-400 font-bold">{formatCurrency(payment.amount)}</p>
            </div>
            <div>
              <p className="text-slate-400">Already Paid</p>
              <p className="text-blue-400 font-semibold">{formatCurrency(payment.paid_amount || 0)}</p>
            </div>
            <div>
              <p className="text-slate-400">Remaining</p>
              <p className="text-orange-400 font-semibold">{formatCurrency(remainingAmount)}</p>
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
            placeholder="0.00"
            allowDecimal={true}
            max={remainingAmount}
          />
          <p className="text-xs text-slate-400 mt-1">Max: {formatCurrency(remainingAmount)}</p>
        </div>

        {/* Remaining After Payment */}
        <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
          <p className="text-xs text-slate-400">Remaining After Payment</p>
          <p className={`text-sm font-semibold ${newRemaining === 0 ? 'text-green-400' : 'text-orange-400'}`}>
            {formatCurrency(newRemaining)}
          </p>
          {newRemaining === 0 && (
            <p className="text-xs text-green-300 mt-1">✓ Payment will be marked as completed</p>
          )}
          {newRemaining > 0 && (
            <p className="text-xs text-orange-300 mt-1">⚠️ Payment will remain pending for remaining amount</p>
          )}
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
        </div>

        {/* Invoice Upload */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Invoice/Document (Optional)</label>
          <input
            type="file"
            onChange={handleInvoiceUpload}
            disabled={uploading}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white text-xs"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
          />
          {invoiceUrl && <p className="text-xs text-green-400 mt-1">✓ Invoice uploaded</p>}
        </div>
      </div>
    </Dialog>
  );
}
