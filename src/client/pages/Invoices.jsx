import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cacheManager } from '../lib/cache';
import { formatDate, formatCurrency } from '../lib/formatters';
import Dialog from '../components/Dialog';
import FilterBar from '../components/FilterBar';
import Table from '../components/Table';
import InvoiceTemplate from '../../pdf/InvoiceTemplate';
import InvoiceTemplateRegular from '../../pdf/InvoiceTemplateRegular';
import RecordInvoicePaymentDialog from '../components/RecordInvoicePaymentDialog';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showRecordPaymentDialog, setShowRecordPaymentDialog] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('regular');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft'
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, startDate, endDate, pageSize]);

  useEffect(() => {
    fetchInvoices(currentPage);
    fetchCompanySettings();
    
    return () => {
      cacheManager.clearAll();
    };
  }, [currentPage, searchTerm, dateFilter, startDate, endDate, pageSize]);

  const fetchInvoices = async (page) => {
    try {
      setLoading(true);
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          status,
          total_amount,
          paid_amount,
          customer_id,
          sales_order_id,
          sales_orders(id, customer_id, customers(id, name))
        `, { count: 'exact' });

      // Apply date filter
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      if (dateFilter === 'this_month') {
        query = query.gte('invoice_date', currentMonth.toISOString().split('T')[0]);
      } else if (dateFilter === 'last_month') {
        query = query.gte('invoice_date', lastMonthStart.toISOString().split('T')[0])
                     .lte('invoice_date', lastMonthEnd.toISOString().split('T')[0]);
      } else if (dateFilter === 'custom' && startDate && endDate) {
        query = query.gte('invoice_date', startDate)
                     .lte('invoice_date', endDate);
      }

      const { data: allInvoices, error } = await query
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      // Client-side filtering
      let filtered = allInvoices;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(inv => 
          inv.invoice_number?.toLowerCase().includes(term) ||
          inv.sales_orders?.customers?.name?.toLowerCase().includes(term)
        );
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const paginatedInvoices = filtered.slice(from, to + 1);

      const mappedInvoices = paginatedInvoices.map(invoice => ({
        ...invoice,
        customer_name: invoice.sales_orders?.customers?.name || 'Unknown'
      }));

      setInvoices(mappedInvoices);
      setTotalCount(filtered.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .single();
      setCompanyData(data || {});
    } catch (err) {
      console.log('No company settings found');
    }
  };

  const handlePreview = async (invoice) => {
    try {
      // Fetch full invoice data dengan relationships
      const { data: fullInvoice, error: invoiceErr } = await supabase
        .from('invoices')
        .select(`
          *,
          sales_orders(
            id,
            order_number,
            total_amount,
            customers(id, name, address, phone, email)
          )
        `)
        .eq('id', invoice.id)
        .single();

      if (invoiceErr) throw invoiceErr;

      // Fetch invoice items dari sales_order_items
      const { data: soItems, error: soErr } = await supabase
        .from('sales_order_items')
        .select(`
          id,
          quantity,
          unit_price,
          products(name)
        `)
        .eq('sales_order_id', fullInvoice.sales_order_id);

      if (soErr) throw soErr;

      const items = (soItems || []).map(item => ({
        ...item,
        product_name: item.products?.name || 'Unknown'
      }));

      // Merge SO data ke invoice
      const invoiceWithData = {
        ...fullInvoice,
        customers: fullInvoice.sales_orders?.customers,
        tax_amount: fullInvoice.tax_amount || 0,
        discount_amount: fullInvoice.discount_amount || 0,
        payment_terms: 'NET 30',
        notes: fullInvoice.notes || '',
        items
      };

      setPreviewInvoice(invoiceWithData);
      setShowPreview(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePrintInvoice = async () => {
    try {
      const { printInvoice } = await import('../lib/printInvoice');
      
      // Get company settings
      const { data: companyData } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      const items = previewInvoice.items || [];
      printInvoice(previewInvoice, items, companyData || {}, selectedTemplate);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditClick = (invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      status: invoice.status
    });
    setShowDialog(true);
  };

  const handleRecordPaymentClick = (invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setShowRecordPaymentDialog(true);
  };

  const handleRecordPaymentSubmit = () => {
    setShowRecordPaymentDialog(false);
    setSelectedInvoiceForPayment(null);
    fetchInvoices(currentPage);
  };

  const handleDeleteClick = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      const { error: deleteErr } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (deleteErr) throw deleteErr;

      setError('');
      alert('Invoice deleted successfully!');
      setCurrentPage(1);
      fetchInvoices(1);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingInvoice) {
        const { error: updateErr } = await supabase
          .from('invoices')
          .update(formData)
          .eq('id', editingInvoice.id);

        if (updateErr) throw updateErr;
        alert('Invoice updated successfully!');
      }

      setError('');
      setShowDialog(false);
      setEditingInvoice(null);
      setFormData({
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      });
      setCurrentPage(1);
      fetchInvoices(1);
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', width: '12%' },
    { key: 'customer_name', label: 'Customer', width: '18%' },
    { 
      key: 'invoice_date', 
      label: 'Date', 
      width: '10%',
      render: (val) => formatDate(val)
    },
    { 
      key: 'due_date', 
      label: 'Due Date', 
      width: '10%',
      render: (val) => formatDate(val)
    },
    { key: 'total_amount', label: 'Amount', width: '12%', render: (val) => formatCurrency(val) },
    { key: 'paid_amount', label: 'Paid', width: '10%', render: (val) => formatCurrency(val) },
    { 
      key: 'status', 
      label: 'Status', 
      width: '10%',
      render: (val) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          val === 'paid' ? 'bg-green-500/30 text-green-200' :
          val === 'partial' ? 'bg-blue-500/30 text-blue-200' :
          val === 'draft' ? 'bg-yellow-500/30 text-yellow-200' :
          'bg-orange-500/30 text-orange-200'
        }`}>
          {val}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '22%',
      render: (_, row) => (
        <div className="flex gap-1 flex-col">
          <button
            onClick={() => handlePreview(row)}
            className="px-2 py-1 text-xs bg-purple-500/30 text-purple-200 hover:bg-purple-500/50 rounded transition-smooth font-medium"
          >
            Preview
          </button>
          {row.status !== 'paid' && (
            <button
              onClick={() => handleRecordPaymentClick(row)}
              className="px-2 py-1 text-xs bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded transition-smooth font-medium"
            >
              Record Payment
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
      <div className="flex justify-between items-center mb-3 sm:mb-4 md:mb-6 lg:mb-8">
        <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold gradient-text">Invoices</h1>
        <button 
          onClick={() => setShowDialog(true)}
          className="px-2 sm:px-3 md:px-4 lg:px-6 py-1 sm:py-1.5 md:py-2 lg:py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium text-xs sm:text-xs md:text-sm lg:text-base"
        >
          + Create Invoice
        </button>
      </div>

      {error && <div className="p-2 sm:p-2.5 md:p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-2 sm:mb-3 md:mb-4 backdrop-blur-sm text-xs sm:text-xs md:text-sm">{error}</div>}

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
        showCustomerTypeFilter={false}
      />

      <Dialog
        isOpen={showDialog}
        title={editingInvoice ? "Edit Invoice" : "Create New Invoice"}
        onClose={() => {
          setShowDialog(false);
          setEditingInvoice(null);
        }}
        onSubmit={handleSubmit}
        submitLabel={editingInvoice ? "Update" : "Create"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Invoice Number</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="INV-000000"
              disabled={!editingInvoice}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Invoice Date</label>
            <input
              type="date"
              value={formData.invoice_date}
              onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option className="bg-slate-800" value="draft">Draft</option>
              <option className="bg-slate-800" value="sent">Sent</option>
              <option className="bg-slate-800" value="paid">Paid</option>
              <option className="bg-slate-800" value="overdue">Overdue</option>
            </select>
          </div>
        </form>
      </Dialog>

      {/* Preview Invoice Modal */}
      {showPreview && previewInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Preview Invoice</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Preview Content - Using Selected Template */}
            <div className="bg-white text-black p-6 rounded-lg mb-4 max-h-[60vh] overflow-y-auto">
              {selectedTemplate === 'regular' ? (
                <InvoiceTemplateRegular 
                  invoice={previewInvoice}
                  items={previewInvoice.items || []}
                  company={companyData || {}}
                />
              ) : (
                <InvoiceTemplate 
                  invoice={previewInvoice}
                  items={previewInvoice.items || []}
                  company={companyData || {}}
                />
              )}
            </div>

            {/* Template Selector */}
            <div className="mb-4 flex gap-2">
              <label className="text-sm font-medium text-slate-300">Template:</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="px-3 py-1 glass-sm rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option className="bg-slate-800" value="regular">Regular</option>
                <option className="bg-slate-800" value="standard">Standard</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePrintInvoice}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-smooth font-medium"
              >
                Print
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-4 py-2 glass-sm text-cyan-300 hover:text-cyan-100 rounded-lg transition-smooth font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <RecordInvoicePaymentDialog
        isOpen={showRecordPaymentDialog}
        onClose={() => setShowRecordPaymentDialog(false)}
        onSubmit={handleRecordPaymentSubmit}
        invoice={selectedInvoiceForPayment}
      />

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : (
        <>
          <Table columns={columns} data={invoices} rowsPerPage={pageSize} />
          
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
    </div>
  );
}
