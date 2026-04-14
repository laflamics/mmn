import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cacheManager } from '../lib/cache';
import { formatDate, formatCurrency } from '../lib/formatters';
import FilterBar from '../components/FilterBar';
import ViewAPPaymentDialog from '../components/ViewAPPaymentDialog';

export default function APaging() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedPaymentDocs, setSelectedPaymentDocs] = useState(null);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewPaymentOpen, setViewPaymentOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, startDate, endDate, pageSize, statusFilter]);

  useEffect(() => {
    fetchData(currentPage);
    
    return () => {
      cacheManager.clearAll();
    };
  }, [currentPage, searchTerm, dateFilter, startDate, endDate, pageSize, statusFilter]);

  const calculateAging = (paymentDate, paymentType, topDays = 0, paidAmount = 0, totalAmount = 0) => {
    const today = new Date();
    const payment = new Date(paymentDate);
    
    // If already paid, don't calculate aging
    if (paidAmount >= totalAmount && totalAmount > 0) {
      return {
        dueDate: payment,
        agingDays: 0,
        isOverdue: false,
        agingStatus: 'Paid',
        daysDisplay: '0d'
      };
    }
    
    // Calculate due date based on payment type
    let dueDate = new Date(payment);
    if (paymentType === 'TOP') {
      dueDate.setDate(dueDate.getDate() + topDays);
    } else if (paymentType === 'CBD') {
      // CBD = Cash Before Delivery (due immediately)
      dueDate = new Date(payment);
    } else if (paymentType === 'COD') {
      // COD = Cash On Delivery (due on delivery, assume same day)
      dueDate = new Date(payment);
    }

    const agingDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    
    let daysDisplay = '';
    let agingStatus = '';
    
    if (agingDays > 0) {
      // Overdue
      daysDisplay = `${agingDays}d Overdue`;
      agingStatus = `Overdue ${agingDays}d`;
    } else if (agingDays === 0) {
      // Due today
      daysDisplay = 'Due Today';
      agingStatus = 'Due Today';
    } else {
      // Not yet due
      const daysUntilDue = Math.abs(agingDays);
      daysDisplay = `${daysUntilDue}d`;
      agingStatus = `Due in ${daysUntilDue}d`;
    }
    
    return {
      dueDate,
      agingDays,
      isOverdue: agingDays > 0,
      agingStatus,
      daysDisplay
    };
  };

  const calculateSummary = (rows) => {
    const totalPayments = rows.length;
    const totalAmount = rows.reduce((sum, row) => sum + (row.total_amount || 0), 0);
    const totalPaid = rows.reduce((sum, row) => sum + (row.paid_amount || 0), 0);
    const totalDiscount = rows.reduce((sum, row) => sum + (row.discount || 0), 0);
    
    // Outstanding = unpaid amount
    const outstanding = rows.filter(row => row.outstanding > 0);
    const totalOutstanding = outstanding.reduce((sum, row) => sum + (row.outstanding || 0), 0);
    
    // Partial paid = has some payment but not fully paid
    const partialPaid = rows.filter(row => row.paid_amount > 0 && row.outstanding > 0);
    const partialPaidAmount = partialPaid.reduce((sum, row) => sum + (row.paid_amount || 0), 0);
    
    // Fully paid
    const fullyPaid = rows.filter(row => row.outstanding <= 0);
    
    // Overdue
    const overdue = rows.filter(row => row.is_overdue && row.outstanding > 0);
    const overdueAmount = overdue.reduce((sum, row) => sum + (row.outstanding || 0), 0);
    
    const avgAgingDays = outstanding.length > 0 
      ? Math.round(outstanding.reduce((sum, row) => sum + (row.aging_days || 0), 0) / outstanding.length)
      : 0;

    return {
      totalPayments,
      totalAmount,
      totalPaid,
      totalDiscount,
      totalOutstanding,
      outstandingCount: outstanding.length,
      partialPaidCount: partialPaid.length,
      partialPaidAmount,
      fullyPaidCount: fullyPaid.length,
      overdueCount: overdue.length,
      overdueAmount,
      avgAgingDays,
      paymentRate: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0
    };
  };

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);

      // Fetch all purchase_orders as the base (so unpaid POs also appear)
      const { data: poData, error: poErr } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          order_date,
          total_amount,
          payment_type,
          top_days,
          suppliers(name)
        `)
        .order('order_date', { ascending: false });

      if (poErr) throw poErr;

      // Fetch all AP payment records keyed by purchase_order_id
      const { data: payData, error: payErr } = await supabase
        .from('payments')
        .select('purchase_order_id, paid_amount, discount, payment_date, payment_proof_url, invoice_url')
        .eq('payment_type', 'ap');

      if (payErr) throw payErr;

      const payMap = {};
      payData?.forEach(p => { payMap[p.purchase_order_id] = p; });

      // Apply date filter (based on PO order_date)
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      let filtered = poData;

      if (dateFilter === 'this_month') {
        filtered = filtered.filter(p => new Date(p.order_date) >= currentMonth);
      } else if (dateFilter === 'last_month') {
        filtered = filtered.filter(p => {
          const pDate = new Date(p.order_date);
          return pDate >= lastMonthStart && pDate <= lastMonthEnd;
        });
      } else if (dateFilter === 'custom' && startDate && endDate) {
        filtered = filtered.filter(p => {
          const pDate = new Date(p.order_date);
          return pDate >= new Date(startDate) && pDate <= new Date(endDate);
        });
      }

      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(p =>
          p.po_number?.toLowerCase().includes(term) ||
          p.suppliers?.name?.toLowerCase().includes(term)
        );
      }

      // Format data with aging calculation
      let rows = filtered.map(po => {
        const pay = payMap[po.id];
        const poPaymentType = po.payment_type || 'TOP';
        const topDays = po.top_days || 60;

        const totalAmount   = po.total_amount || 0;
        const paidAmount    = pay?.paid_amount || 0;
        const discountAmt   = pay?.discount || 0;
        const outstandingAmount = totalAmount - paidAmount - discountAmt;

        // Use payment_date if paid, otherwise use order_date for aging
        const baseDate = pay?.payment_date || po.order_date;
        const aging = calculateAging(baseDate, poPaymentType, topDays, paidAmount + discountAmt, totalAmount);

        let status = 'pending';
        if (paidAmount + discountAmt >= totalAmount && totalAmount > 0) {
          status = 'completed';
        } else if (paidAmount > 0) {
          status = 'partial';
        }

        return {
          id: po.id,
          supplier_name: po.suppliers?.name || 'Unknown',
          po_number: po.po_number,
          payment_date: baseDate,
          payment_type: poPaymentType,
          top_days: topDays,
          due_date: aging.dueDate.toISOString().split('T')[0],
          total_amount: totalAmount,
          discount: discountAmt,
          paid_amount: paidAmount,
          outstanding: outstandingAmount,
          aging_days: aging.agingDays,
          aging_status: aging.agingStatus,
          days_display: aging.daysDisplay,
          is_overdue: aging.isOverdue,
          status,
          payment_proof_url: pay?.payment_proof_url,
          invoice_url: pay?.invoice_url,
        };
      });

      // Apply status filter
      if (statusFilter === 'outstanding') {
        rows = rows.filter(row => row.outstanding > 0);
      } else if (statusFilter === 'paid') {
        rows = rows.filter(row => row.status === 'completed');
      } else if (statusFilter === 'partial') {
        rows = rows.filter(row => row.status === 'partial');
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const paginatedRows = rows.slice(from, to + 1);

      setData(paginatedRows);
      setTotalCount(rows.length);
      setSummary(calculateSummary(rows));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocuments = (row) => {
    setSelectedPaymentDocs(row);
    setShowDocumentsModal(true);
  };

  const handleViewPayment = (row) => {
    setSelectedPayment(row);
    setViewPaymentOpen(true);
  };

  const handleCloseViewPayment = () => {
    setViewPaymentOpen(false);
    setSelectedPayment(null);
  };

  const exportToCSV = () => {
    if (data.length === 0) return;
    
    const csv = [
      ['Supplier', 'PO #', 'Payment Date', 'Payment Type', 'TOP Days', 'Due Date', 'Total Amount', 'Discount', 'Paid Amount', 'Outstanding', 'Aging Days', 'Aging Status', 'Status'].join(','),
      ...data.map(row => [
        row.supplier_name,
        row.po_number,
        row.payment_date,
        row.payment_type,
        row.top_days,
        row.due_date,
        row.total_amount,
        row.discount,
        row.paid_amount,
        row.outstanding,
        row.aging_days,
        row.aging_status,
        row.status
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ap-aging-report.csv';
    a.click();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">AP Aging Report</h1>
        <button
          onClick={exportToCSV}
          className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-smooth font-medium"
        >
          ⬇ Export CSV
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
        searchPlaceholder="PO # or Supplier"
      />

      {/* Status Filter Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-smooth ${
            statusFilter === 'all'
              ? 'bg-blue-500/30 text-blue-200 border border-blue-500/50'
              : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700'
          }`}
        >
          All Payments
        </button>
        <button
          onClick={() => setStatusFilter('outstanding')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-smooth ${
            statusFilter === 'outstanding'
              ? 'bg-orange-500/30 text-orange-200 border border-orange-500/50'
              : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700'
          }`}
        >
          Outstanding
        </button>
        <button
          onClick={() => setStatusFilter('partial')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-smooth ${
            statusFilter === 'partial'
              ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/50'
              : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700'
          }`}
        >
          Partial Paid
        </button>
        <button
          onClick={() => setStatusFilter('paid')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-smooth ${
            statusFilter === 'paid'
              ? 'bg-green-500/30 text-green-200 border border-green-500/50'
              : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700'
          }`}
        >
          Fully Paid
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          {/* Total Outstanding */}
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(summary.totalOutstanding)}</p>
            <p className="text-xs text-slate-500 mt-2">{summary.outstandingCount} items</p>
          </div>

          {/* Partial Paid */}
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Partial Paid</p>
            <p className="text-2xl font-bold text-yellow-400">{formatCurrency(summary.partialPaidAmount)}</p>
            <p className="text-xs text-slate-500 mt-2">{summary.partialPaidCount} items</p>
          </div>

          {/* Total Paid */}
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.totalPaid)}</p>
            <p className="text-xs text-slate-500 mt-2">{summary.fullyPaidCount} fully paid</p>
          </div>

          {/* Total Discount */}
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Total Discount</p>
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(summary.totalDiscount)}</p>
            <p className="text-xs text-slate-500 mt-2">savings</p>
          </div>

          {/* Payment Rate */}
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Payment Rate</p>
            <p className="text-2xl font-bold text-green-400">{summary.paymentRate}%</p>
            <p className="text-xs text-slate-500 mt-2">of total amount</p>
          </div>

          {/* Avg Aging Days */}
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Avg Aging Days</p>
            <p className="text-2xl font-bold text-blue-400">{summary.avgAgingDays}d</p>
            <p className="text-xs text-slate-500 mt-2">{summary.totalPayments} total items</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No AP payments found</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Supplier</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">PO #</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Payment Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Terms</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Total Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Discount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Paid</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Outstanding</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Aging</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 text-sm text-slate-200">{row.supplier_name}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{row.po_number}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{formatDate(row.payment_date)}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/30 text-blue-200">
                        {row.payment_type === 'TOP' ? `TOP ${row.top_days}d` : row.payment_type}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">{formatDate(row.due_date)}</td>
                    <td className="px-4 py-4 text-sm text-slate-200">{formatCurrency(row.total_amount)}</td>
                    <td className="px-4 py-4 text-sm text-red-400">{formatCurrency(row.discount)}</td>
                    <td className="px-4 py-4 text-sm text-green-400">{formatCurrency(row.paid_amount)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-orange-400">{formatCurrency(row.outstanding)}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        row.status === 'completed' ? 'bg-slate-500/30 text-slate-300' :
                        row.is_overdue 
                          ? 'bg-red-500/30 text-red-200' 
                          : 'bg-green-500/30 text-green-200'
                      }`}>
                        {row.days_display}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        row.status === 'completed' ? 'bg-green-500/30 text-green-200' :
                        row.status === 'partial' ? 'bg-orange-500/30 text-orange-200' :
                        'bg-yellow-500/30 text-yellow-200'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewPayment(row)}
                          className="px-3 py-1 text-xs bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded transition-smooth font-medium"
                        >
                          View
                        </button>
                        {(row.payment_proof_url || row.invoice_url) && (
                          <button
                            onClick={() => handleViewDocuments(row)}
                            className="px-3 py-1 text-xs bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded transition-smooth font-medium"
                          >
                            Docs
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <p className="text-slate-400 text-sm">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} payments
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-smooth"
              >
                ← Previous
              </button>
              <span className="px-4 py-2 text-slate-300">
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-smooth"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Documents Modal */}
      {showDocumentsModal && selectedPaymentDocs && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Payment Documents</h2>
                <p className="text-xs text-slate-400 mt-1">PO: {selectedPaymentDocs.po_number} | {selectedPaymentDocs.supplier_name}</p>
              </div>
              <button
                onClick={() => setShowDocumentsModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Transfer Proof */}
              {selectedPaymentDocs.payment_proof_url ? (
                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                  <p className="text-sm font-semibold text-white mb-3">Transfer Proof</p>
                  <a
                    href={selectedPaymentDocs.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded-lg transition-smooth font-medium text-sm"
                  >
                    📄 View Transfer Proof
                  </a>
                </div>
              ) : (
                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                  <p className="text-sm font-semibold text-white mb-2">Transfer Proof</p>
                  <p className="text-xs text-slate-400">No transfer proof uploaded</p>
                </div>
              )}

              {/* Invoice */}
              {selectedPaymentDocs.invoice_url ? (
                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                  <p className="text-sm font-semibold text-white mb-3">Invoice/Document</p>
                  <a
                    href={selectedPaymentDocs.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded-lg transition-smooth font-medium text-sm"
                  >
                    📋 View Invoice
                  </a>
                </div>
              ) : (
                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                  <p className="text-sm font-semibold text-white mb-2">Invoice/Document</p>
                  <p className="text-xs text-slate-400">No invoice uploaded</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDocumentsModal(false)}
              className="w-full mt-6 px-4 py-2 bg-slate-700 text-slate-200 hover:bg-slate-600 rounded-lg transition-smooth font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <ViewAPPaymentDialog
        isOpen={viewPaymentOpen}
        payment={selectedPayment}
        onClose={handleCloseViewPayment}
      />
    </div>
  );
}
