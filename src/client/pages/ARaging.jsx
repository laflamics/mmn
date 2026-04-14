import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cacheManager } from '../lib/cache';
import { formatDate, formatCurrency } from '../lib/formatters';
import FilterBar from '../components/FilterBar';
import ViewInvoiceDialog from '../components/ViewInvoiceDialog';

export default function ARaging() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewInvoiceOpen, setViewInvoiceOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);


  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, startDate, endDate, pageSize, statusFilter]);

  useEffect(() => {
    fetchData(currentPage);
    
    return () => {
      cacheManager.clearAll();
    };
  }, [currentPage, searchTerm, dateFilter, startDate, endDate, pageSize, statusFilter]);

  const handleViewInvoice = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setViewInvoiceOpen(true);
  };

  const handleCloseViewInvoice = () => {
    setViewInvoiceOpen(false);
    setSelectedInvoiceId(null);
  };

  const calculateAging = (invoiceDate, dueDate, status) => {
    // Don't calculate aging if already paid or overpaid
    if (status === 'paid' || status === 'overpaid') {
      return {
        agingDays: 0,
        isOverdue: false,
        agingStatus: status === 'paid' ? 'Paid' : 'Overpaid'
      };
    }

    const today = new Date();
    const due = new Date(dueDate);
    
    const agingDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    
    return {
      agingDays,
      isOverdue: agingDays > 0,
      agingStatus: agingDays > 0 ? `Overdue ${agingDays}d` : `Due in ${Math.abs(agingDays)}d`
    };
  };

  const calculateSummary = (rows) => {
    const totalInvoices = rows.length;
    const totalAmount = rows.reduce((sum, row) => sum + (row.total_amount || 0), 0);
    const totalPaid = rows.reduce((sum, row) => sum + (row.paid_amount || 0), 0);
    
    // Outstanding = only unpaid invoices with outstanding balance
    const unpaid = rows.filter(row => row.status !== 'paid' && row.outstanding > 0);
    const totalOutstanding = unpaid.reduce((sum, row) => sum + (row.outstanding || 0), 0);
    
    // Overdue = only unpaid invoices that are overdue
    const overdue = rows.filter(row => row.is_overdue && row.status !== 'paid' && row.outstanding > 0);
    const overdueAmount = overdue.reduce((sum, row) => sum + (row.outstanding || 0), 0);
    
    const paid = rows.filter(row => row.status === 'paid');
    const overpaid = rows.filter(row => row.status === 'overpaid');
    const overpaidAmount = overpaid.reduce((sum, row) => sum + Math.abs(row.outstanding || 0), 0);
    
    const avgAgingDays = unpaid.length > 0 
      ? Math.round(unpaid.reduce((sum, row) => sum + (row.aging_days || 0), 0) / unpaid.length)
      : 0;

    return {
      totalInvoices,
      totalAmount,
      totalPaid,
      totalOutstanding,
      overdueCount: overdue.length,
      overdueAmount,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      overpaidCount: overpaid.length,
      overpaidAmount,
      avgAgingDays,
      collectionRate: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0
    };
  };

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      // Fetch all invoices first (for filtering)
      const { data: invoiceData, error: invoiceErr } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          paid_amount,
          status,
          sales_order_id,
          sales_orders(
            customer_id,
            customers(name)
          )
        `)
        .order('invoice_date', { ascending: false });

      if (invoiceErr) throw invoiceErr;

      // Fetch items for all invoices to calculate correct totals
      const { data: itemsData, error: itemsErr } = await supabase
        .from('sales_order_items')
        .select('sales_order_id, quantity, unit_price');

      if (itemsErr) throw itemsErr;

      // Group items by sales_order_id and calculate totals
      const itemTotalsByOrder = {};
      (itemsData || []).forEach(item => {
        if (!itemTotalsByOrder[item.sales_order_id]) {
          itemTotalsByOrder[item.sales_order_id] = 0;
        }
        itemTotalsByOrder[item.sales_order_id] += item.quantity * item.unit_price;
      });

      // Apply date filter
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      let filtered = invoiceData;

      if (dateFilter === 'this_month') {
        filtered = filtered.filter(inv => new Date(inv.invoice_date) >= currentMonth);
      } else if (dateFilter === 'last_month') {
        filtered = filtered.filter(inv => {
          const invDate = new Date(inv.invoice_date);
          return invDate >= lastMonthStart && invDate <= lastMonthEnd;
        });
      } else if (dateFilter === 'custom' && startDate && endDate) {
        filtered = filtered.filter(inv => {
          const invDate = new Date(inv.invoice_date);
          return invDate >= new Date(startDate) && invDate <= new Date(endDate);
        });
      }

      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(inv =>
          inv.invoice_number?.toLowerCase().includes(term) ||
          inv.sales_orders?.customers?.name?.toLowerCase().includes(term)
        );
      }

      // Format data with aging calculation BEFORE status filtering
      let rows = filtered.map(invoice => {
        // Use calculated total from items, fallback to database value
        const correctTotal = itemTotalsByOrder[invoice.sales_order_id] || invoice.total_amount || 0;
        const paidAmount = invoice.paid_amount || 0;
        const outstandingAmount = correctTotal - paidAmount;
        
        // Determine actual status based on payment
        let actualStatus = invoice.status;
        if (outstandingAmount > 0) {
          actualStatus = 'unpaid'; // Still has outstanding
        } else if (outstandingAmount < 0) {
          actualStatus = 'overpaid'; // Paid more than invoice amount
        } else if (outstandingAmount === 0) {
          actualStatus = 'paid'; // Exactly paid
        }

        // Calculate aging (skip if paid)
        const aging = calculateAging(invoice.invoice_date, invoice.due_date, actualStatus);
        
        const customerName = invoice.sales_orders?.customers?.name || 'Unknown';

        return {
          id: invoice.id,
          customer_name: customerName,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          total_amount: correctTotal,
          paid_amount: paidAmount,
          outstanding: outstandingAmount,
          aging_days: aging.agingDays,
          aging_status: aging.agingStatus,
          is_overdue: aging.isOverdue,
          status: actualStatus
        };
      });

      // Apply status filter AFTER formatting
      if (statusFilter === 'outstanding') {
        rows = rows.filter(row => row.status === 'unpaid' && row.outstanding > 0);
      } else if (statusFilter === 'paid') {
        rows = rows.filter(row => row.status === 'paid');
      } else if (statusFilter === 'overpaid') {
        rows = rows.filter(row => row.status === 'overpaid');
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

  const exportToCSV = () => {
    if (data.length === 0) return;
    
    const csv = [
      ['Customer', 'Invoice #', 'Invoice Date', 'Due Date', 'Total Amount', 'Paid Amount', 'Outstanding', 'Aging Days', 'Aging Status', 'Status'].join(','),
      ...data.map(row => [
        row.customer_name,
        row.invoice_number,
        row.invoice_date,
        row.due_date,
        row.total_amount,
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
    a.download = 'ar-aging-report.csv';
    a.click();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">AR Aging Report</h1>
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
        searchPlaceholder="Invoice # or Customer"
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
          All Invoices
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
          onClick={() => setStatusFilter('paid')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-smooth ${
            statusFilter === 'paid'
              ? 'bg-green-500/30 text-green-200 border border-green-500/50'
              : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700'
          }`}
        >
          Paid
        </button>
        <button
          onClick={() => setStatusFilter('overpaid')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-smooth ${
            statusFilter === 'overpaid'
              ? 'bg-blue-500/30 text-blue-200 border border-blue-500/50'
              : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700'
          }`}
        >
          Overpaid
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          {/* Total Outstanding */}
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(summary.totalOutstanding)}</p>
            <p className="text-xs text-slate-500 mt-2">{summary.unpaidCount} unpaid invoices</p>
          </div>

          {/* Overdue Amount */}
          <div className={`glass rounded-lg p-4 border ${summary.overdueAmount > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-slate-700'}`}>
            <p className="text-xs font-medium text-slate-400 mb-1">Overdue Amount</p>
            <p className={`text-2xl font-bold ${summary.overdueAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {formatCurrency(summary.overdueAmount)}
            </p>
            <p className="text-xs text-slate-500 mt-2">{summary.overdueCount} overdue invoices</p>
          </div>

          {/* Total Paid */}
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.totalPaid)}</p>
            <p className="text-xs text-slate-500 mt-2">{summary.paidCount} paid invoices</p>
          </div>

          {/* Overpaid (Saving) */}
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Overpaid (Saving)</p>
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(summary.overpaidAmount)}</p>
            <p className="text-xs text-slate-500 mt-2">{summary.overpaidCount} overpaid invoices</p>
          </div>

          {/* Collection Rate */}
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Collection Rate</p>
            <p className="text-2xl font-bold text-green-400">{summary.collectionRate}%</p>
            <p className="text-xs text-slate-500 mt-2">of total invoiced</p>
          </div>

          {/* Avg Aging Days */}
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Avg Aging Days</p>
            <p className="text-2xl font-bold text-blue-400">{summary.avgAgingDays}d</p>
            <p className="text-xs text-slate-500 mt-2">{summary.totalInvoices} total invoices</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No AR invoices found</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Invoice #</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Invoice Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Total Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Paid</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Outstanding</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Aging</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 text-sm text-slate-200">{row.customer_name}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{row.invoice_number}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{formatDate(row.invoice_date)}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{formatDate(row.due_date)}</td>
                    <td className="px-4 py-4 text-sm text-slate-200">{formatCurrency(row.total_amount)}</td>
                    <td className="px-4 py-4 text-sm text-green-400">{formatCurrency(row.paid_amount)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-orange-400">{formatCurrency(row.outstanding)}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        row.status === 'paid' || row.status === 'overpaid' 
                          ? 'bg-slate-500/30 text-slate-300'
                          : row.aging_days <= 0
                          ? 'bg-green-500/30 text-green-200'
                          : row.aging_days <= 7
                          ? 'bg-yellow-500/30 text-yellow-200'
                          : row.aging_days <= 30
                          ? 'bg-orange-500/30 text-orange-200'
                          : 'bg-red-500/30 text-red-200'
                      }`}>
                        {row.aging_days}d
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        row.status === 'paid' ? 'bg-green-500/30 text-green-200' :
                        row.status === 'overpaid' ? 'bg-blue-500/30 text-blue-200' :
                        row.status === 'unpaid' ? 'bg-orange-500/30 text-orange-200' :
                        'bg-slate-500/30 text-slate-200'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <button
                        onClick={() => handleViewInvoice(row.id)}
                        className="px-3 py-1 bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded text-xs font-medium transition-smooth"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <p className="text-slate-400 text-sm">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} invoices
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

      <ViewInvoiceDialog
        isOpen={viewInvoiceOpen}
        invoiceId={selectedInvoiceId}
        onClose={handleCloseViewInvoice}
      />
    </div>
  );
}