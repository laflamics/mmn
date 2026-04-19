import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cacheManager } from '../lib/cache';
import { formatDate, formatCurrency } from '../lib/formatters';
import RecordCustomerPaymentDialog from '../components/RecordCustomerPaymentDialog';
import * as XLSX from 'xlsx';

export default function ARSummary() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState({});
  const [showRecordPaymentDialog, setShowRecordPaymentDialog] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchData();
    
    return () => {
      cacheManager.clearAll();
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all invoices with customer info
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
            customers(id, name, type, sales_person)
          )
        `)
        .order('due_date', { ascending: true });

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

      // Group invoices by customer
      const customerMap = {};
      
      invoiceData.forEach(invoice => {
        const customerId = invoice.sales_orders?.customers?.id;
        const customerName = invoice.sales_orders?.customers?.name || 'Unknown';
        const customerType = invoice.sales_orders?.customers?.type || 'B2C';
        const salesPerson = invoice.sales_orders?.customers?.sales_person || '-';
        
        if (!customerId) return;

        // Use calculated total from items, fallback to database value
        const correctTotal = itemTotalsByOrder[invoice.sales_order_id] || invoice.total_amount || 0;
        const paidAmount = invoice.paid_amount || 0;
        const outstandingAmount = correctTotal - paidAmount;

        // Only include invoices with outstanding balance
        if (outstandingAmount <= 0) return;

        if (!customerMap[customerId]) {
          customerMap[customerId] = {
            customer_id: customerId,
            customer_name: customerName,
            customer_type: customerType,
            sales_person: salesPerson,
            total_outstanding: 0,
            total_invoices: 0,
            oldest_due_date: invoice.due_date,
            invoices: []
          };
        }

        customerMap[customerId].total_outstanding += outstandingAmount;
        customerMap[customerId].total_invoices += 1;
        
        // Track oldest due date
        if (new Date(invoice.due_date) < new Date(customerMap[customerId].oldest_due_date)) {
          customerMap[customerId].oldest_due_date = invoice.due_date;
        }

        customerMap[customerId].invoices.push({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          total_amount: correctTotal,
          paid_amount: paidAmount,
          outstanding: outstandingAmount,
          status: invoice.status
        });
      });

      // Convert to array and sort by total outstanding (descending)
      const customerArray = Object.values(customerMap).sort((a, b) => 
        b.total_outstanding - a.total_outstanding
      );

      setData(customerArray);
      
      // Calculate summary
      const totalOutstanding = customerArray.reduce((sum, c) => sum + c.total_outstanding, 0);
      const totalCustomers = customerArray.length;
      const totalInvoices = customerArray.reduce((sum, c) => sum + c.total_invoices, 0);
      
      setSummary({
        totalOutstanding,
        totalCustomers,
        totalInvoices
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandCustomer = async (customerId) => {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null);
      return;
    }

    setExpandedCustomer(customerId);
    
    // Find customer data
    const customer = data.find(c => c.customer_id === customerId);
    if (customer && customer.invoices) {
      // Sort invoices by due date (oldest first)
      const sortedInvoices = [...customer.invoices].sort((a, b) => 
        new Date(a.due_date) - new Date(b.due_date)
      );
      setCustomerInvoices({
        ...customerInvoices,
        [customerId]: sortedInvoices
      });
    }
  };

  const handleRecordPayment = (customer) => {
    setSelectedCustomerForPayment(customer);
    setShowRecordPaymentDialog(true);
  };

  const handleRecordPaymentSubmit = () => {
    setShowRecordPaymentDialog(false);
    setSelectedCustomerForPayment(null);
    fetchData();
  };

  const getFilteredData = () => {
    if (!searchTerm) return data;
    
    const term = searchTerm.toLowerCase();
    return data.filter(c => 
      c.customer_name.toLowerCase().includes(term) ||
      c.sales_person?.toLowerCase().includes(term)
    );
  };

  const exportToExcel = () => {
    if (data.length === 0) return;

    // Prepare data for export - summary only
    const exportData = data.map((customer, idx) => ({
      'No': idx + 1,
      'Customer Name': customer.customer_name,
      'Customer Type': customer.customer_type,
      'Sales Person': customer.sales_person,
      'Total Outstanding': customer.total_outstanding,
      'Total Invoices': customer.total_invoices,
      'Oldest Due Date': formatDate(customer.oldest_due_date),
      'Days Overdue': Math.floor((new Date() - new Date(customer.oldest_due_date)) / (1000 * 60 * 60 * 24))
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 30 }, // Customer Name
      { wch: 12 }, // Customer Type
      { wch: 18 }, // Sales Person
      { wch: 18 }, // Total Outstanding
      { wch: 12 }, // Total Invoices
      { wch: 15 }, // Oldest Due Date
      { wch: 12 }  // Days Overdue
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AR Summary');

    // Generate filename with date
    const filename = `AR_Summary_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
  };

  const filteredData = getFilteredData();

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text">AR Summary per Customer</h1>
        <button
          onClick={exportToExcel}
          disabled={data.length === 0}
          className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-smooth font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📊 Export Excel
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by customer name or sales person..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 glass-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Total Outstanding AR</p>
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(summary.totalOutstanding)}</p>
            <p className="text-xs text-slate-500 mt-2">Across all customers</p>
          </div>

          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Total Customers</p>
            <p className="text-2xl font-bold text-blue-400">{summary.totalCustomers}</p>
            <p className="text-xs text-slate-500 mt-2">With outstanding balance</p>
          </div>

          <div className="glass rounded-lg p-4 border border-slate-700">
            <p className="text-xs font-medium text-slate-400 mb-1">Total Invoices</p>
            <p className="text-2xl font-bold text-purple-400">{summary.totalInvoices}</p>
            <p className="text-xs text-slate-500 mt-2">Unpaid invoices</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No outstanding AR found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredData.map((customer, idx) => (
            <div key={customer.customer_id} className="glass rounded-lg border border-slate-700 overflow-hidden">
              {/* Customer Summary Row */}
              <div 
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => handleExpandCustomer(customer.customer_id)}
              >
                {/* Mobile Layout */}
                <div className="block md:hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg">{customer.customer_name}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          customer.customer_type === 'B2B' ? 'bg-blue-500/30 text-blue-200' : 'bg-green-500/30 text-green-200'
                        }`}>
                          {customer.customer_type}
                        </span>
                        <span className="ml-2">Sales: {customer.sales_person}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Outstanding</p>
                      <p className="text-xl font-bold text-orange-400">{formatCurrency(customer.total_outstanding)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-slate-400">Invoices</p>
                      <p className="text-lg font-semibold text-white">{customer.total_invoices} invoices</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Oldest Due</p>
                      <p className="text-sm font-medium text-red-400">{formatDate(customer.oldest_due_date)}</p>
                      <p className="text-xs text-slate-500">
                        {Math.floor((new Date() - new Date(customer.oldest_due_date)) / (1000 * 60 * 60 * 24))} days overdue
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecordPayment(customer);
                      }}
                      className="flex-1 px-3 py-2 bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded-lg transition-smooth font-medium text-sm"
                    >
                      💰 Pay
                    </button>
                    <button
                      className="px-3 py-2 bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded-lg transition-smooth font-medium text-sm"
                    >
                      {expandedCustomer === customer.customer_id ? '▼' : '▶'}
                    </button>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                  <div className="col-span-1 text-center">
                    <span className="text-2xl font-bold text-slate-500">#{idx + 1}</span>
                  </div>
                  
                  <div className="col-span-3">
                    <p className="text-white font-semibold text-lg">{customer.customer_name}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        customer.customer_type === 'B2B' ? 'bg-blue-500/30 text-blue-200' : 'bg-green-500/30 text-green-200'
                      }`}>
                        {customer.customer_type}
                      </span>
                      <span className="ml-2">Sales: {customer.sales_person}</span>
                    </p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Total Outstanding</p>
                    <p className="text-xl font-bold text-orange-400">{formatCurrency(customer.total_outstanding)}</p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Total Invoices</p>
                    <p className="text-lg font-semibold text-white">{customer.total_invoices} invoices</p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Oldest Due Date</p>
                    <p className="text-sm font-medium text-red-400">{formatDate(customer.oldest_due_date)}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {Math.floor((new Date() - new Date(customer.oldest_due_date)) / (1000 * 60 * 60 * 24))} days overdue
                    </p>
                  </div>

                  <div className="col-span-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecordPayment(customer);
                      }}
                      className="flex-1 px-3 py-2 bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded-lg transition-smooth font-medium text-sm"
                    >
                      💰 Pay
                    </button>
                    <button
                      className="px-3 py-2 bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded-lg transition-smooth font-medium text-sm"
                    >
                      {expandedCustomer === customer.customer_id ? '▼' : '▶'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Invoice Details */}
              {expandedCustomer === customer.customer_id && (
                <div className="border-t border-slate-700 bg-slate-800/30">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Invoice Details</h3>
                    <div className="space-y-2">
                      {(customerInvoices[customer.customer_id] || customer.invoices).map((invoice, invIdx) => (
                        <div 
                          key={invoice.id} 
                          className={`p-3 rounded-lg border ${
                            invIdx === 0 
                              ? 'bg-red-500/10 border-red-500/30' 
                              : 'bg-slate-700/30 border-slate-600'
                          }`}
                        >
                          {/* Mobile Layout */}
                          <div className="block md:hidden">
                            {invIdx === 0 && (
                              <div className="mb-2">
                                <span className="px-2 py-1 bg-red-500/30 text-red-200 rounded text-xs font-semibold">
                                  OLDEST
                                </span>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <p className="text-slate-400 text-xs">Invoice #</p>
                                <p className="text-white font-medium">{invoice.invoice_number}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 text-xs">Amount</p>
                                <p className="text-white font-semibold">{formatCurrency(invoice.total_amount)}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <p className="text-slate-400 text-xs">Invoice Date</p>
                                <p className="text-slate-300">{formatDate(invoice.invoice_date)}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 text-xs">Due Date</p>
                                <p className="text-red-400 font-medium">{formatDate(invoice.due_date)}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <p className="text-slate-400 text-xs">Paid</p>
                                <p className="text-green-400">{formatCurrency(invoice.paid_amount)}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 text-xs">Outstanding</p>
                                <p className="text-orange-400 font-bold">{formatCurrency(invoice.outstanding)}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 text-xs">Status</p>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  invoice.status === 'paid' ? 'bg-green-500/30 text-green-200' :
                                  invoice.status === 'overpaid' ? 'bg-blue-500/30 text-blue-200' :
                                  'bg-orange-500/30 text-orange-200'
                                }`}>
                                  {invoice.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden md:grid md:grid-cols-12 gap-4 items-center text-sm">
                            <div className="col-span-1">
                              {invIdx === 0 && (
                                <span className="px-2 py-1 bg-red-500/30 text-red-200 rounded text-xs font-semibold">
                                  OLDEST
                                </span>
                              )}
                            </div>
                            <div className="col-span-2">
                              <p className="text-slate-400 text-xs">Invoice #</p>
                              <p className="text-white font-medium">{invoice.invoice_number}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-slate-400 text-xs">Invoice Date</p>
                              <p className="text-slate-300">{formatDate(invoice.invoice_date)}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-slate-400 text-xs">Due Date</p>
                              <p className="text-red-400 font-medium">{formatDate(invoice.due_date)}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-slate-400 text-xs">Amount</p>
                              <p className="text-white font-semibold">{formatCurrency(invoice.total_amount)}</p>
                            </div>
                            <div className="col-span-1">
                              <p className="text-slate-400 text-xs">Paid</p>
                              <p className="text-green-400">{formatCurrency(invoice.paid_amount)}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-slate-400 text-xs">Outstanding</p>
                              <p className="text-orange-400 font-bold">{formatCurrency(invoice.outstanding)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <RecordCustomerPaymentDialog
        isOpen={showRecordPaymentDialog}
        onClose={() => setShowRecordPaymentDialog(false)}
        onSubmit={handleRecordPaymentSubmit}
        customer={selectedCustomerForPayment}
      />
    </div>
  );
}
