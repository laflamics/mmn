import { formatDate, formatCurrency } from '../lib/formatters';

export default function ViewAPPaymentDialog({ isOpen, payment, onClose }) {
  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">AP Payment Details</h2>
            <p className="text-xs text-slate-400 mt-1">PO: {payment.po_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Supplier & PO Info */}
          <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
            <p className="text-sm font-semibold text-white mb-3">Supplier & PO Information</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Supplier</p>
                <p className="text-white font-medium">{payment.supplier_name}</p>
              </div>
              <div>
                <p className="text-slate-400">PO Number</p>
                <p className="text-white font-medium">{payment.po_number}</p>
              </div>
              <div>
                <p className="text-slate-400">Payment Type</p>
                <p className="text-white font-medium">
                  {payment.payment_type === 'TOP' ? `TOP ${payment.top_days}d` : payment.payment_type}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Status</p>
                <span className={`px-2 py-1 rounded text-xs font-semibold inline-block ${
                  payment.status === 'completed' ? 'bg-green-500/30 text-green-200' :
                  payment.status === 'partial' ? 'bg-orange-500/30 text-orange-200' :
                  'bg-yellow-500/30 text-yellow-200'
                }`}>
                  {payment.status}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
            <p className="text-sm font-semibold text-white mb-3">Dates</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Payment Date</p>
                <p className="text-white font-medium">{formatDate(payment.payment_date)}</p>
              </div>
              <div>
                <p className="text-slate-400">Due Date</p>
                <p className="text-white font-medium">{formatDate(payment.due_date)}</p>
              </div>
              <div>
                <p className="text-slate-400">Aging</p>
                <p className={`font-medium ${
                  payment.status === 'completed' ? 'text-slate-300' :
                  payment.is_overdue ? 'text-red-400' : 'text-green-400'
                }`}>
                  {payment.days_display}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Aging Days</p>
                <p className="text-white font-medium">{payment.aging_days}d</p>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
            <p className="text-sm font-semibold text-white mb-3">Financial Details</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Amount</span>
                <span className="text-white font-medium">{formatCurrency(payment.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Discount</span>
                <span className="text-red-400 font-medium">{formatCurrency(payment.discount)}</span>
              </div>
              <div className="border-t border-slate-600 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount After Discount</span>
                  <span className="text-white font-medium">{formatCurrency(payment.total_amount - payment.discount)}</span>
                </div>
              </div>
              <div className="border-t border-slate-600 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Paid Amount</span>
                  <span className="text-green-400 font-medium">{formatCurrency(payment.paid_amount)}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Outstanding</span>
                <span className="text-orange-400 font-medium">{formatCurrency(payment.outstanding)}</span>
              </div>
            </div>
          </div>

          {/* Payment Progress */}
          <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
            <p className="text-sm font-semibold text-white mb-3">Payment Progress</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Payment Rate</span>
                <span className="text-white font-medium">
                  {payment.total_amount > 0 ? Math.round((payment.paid_amount / payment.total_amount) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${payment.total_amount > 0 ? Math.min((payment.paid_amount / payment.total_amount) * 100, 100) : 0}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          {(payment.payment_proof_url || payment.invoice_url) && (
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
              <p className="text-sm font-semibold text-white mb-3">Documents</p>
              <div className="space-y-2">
                {payment.payment_proof_url && (
                  <a
                    href={payment.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded-lg transition-smooth font-medium text-sm w-full justify-center"
                  >
                    📄 View Payment Proof
                  </a>
                )}
                {payment.invoice_url && (
                  <a
                    href={payment.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded-lg transition-smooth font-medium text-sm w-full justify-center"
                  >
                    📋 View Invoice
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-slate-700 text-slate-200 hover:bg-slate-600 rounded-lg transition-smooth font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}
