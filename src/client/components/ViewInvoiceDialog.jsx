import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, formatCurrency } from '../lib/formatters';
import Dialog from './Dialog';
import { printInvoice } from '../lib/printInvoice';

export default function ViewInvoiceDialog({ isOpen, invoiceId, onClose }) {
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoiceDetails();
      fetchCompanySettings();
    }
  }, [isOpen, invoiceId]);

  const fetchCompanySettings = async () => {
    try {
      const { data, error: err } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (err && err.code !== 'PGRST116') throw err;
      setCompany(data || {});
    } catch (err) {
      console.error('Error fetching company settings:', err);
    }
  };

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: err } = await supabase
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
            customers(name, address, phone)
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (err) throw err;

      // Fetch invoice items
      const { data: itemsData, error: itemsErr } = await supabase
        .from('sales_order_items')
        .select(`
          id,
          quantity,
          unit_price,
          products(name, sku)
        `)
        .eq('sales_order_id', data.sales_order_id);

      if (itemsErr) throw itemsErr;
      
      const formattedItems = (itemsData || []).map(item => ({
        ...item,
        product_name: item.products?.name || 'Unknown',
        sku: item.products?.sku || '-'
      }));

      // Calculate correct total from items
      const correctTotal = formattedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const outstanding = correctTotal - (data.paid_amount || 0);
      
      setInvoice({
        ...data,
        outstanding,
        total_amount: correctTotal, // Override with correct total
        customers: data.sales_orders?.customers || {}
      });
      setItems(formattedItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (invoice && items.length > 0) {
      await printInvoice(invoice, items, company || {}, 'regular');
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      title={loading ? 'Loading...' : `Invoice ${invoice?.invoice_number || ''}`}
      onClose={onClose}
      onSubmit={handlePrint}
      submitLabel="Print"
      cancelLabel="Close"
    >
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-slate-400">Loading invoice details...</p>
        </div>
      ) : invoice ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Invoice Info */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">Customer</p>
              <p className="text-sm text-slate-200">{invoice.customers?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">Invoice Number</p>
              <p className="text-sm text-slate-200">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">Invoice Date</p>
              <p className="text-sm text-slate-200">{formatDate(invoice.invoice_date)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">Due Date</p>
              <p className="text-sm text-slate-200">{formatDate(invoice.due_date)}</p>
            </div>
          </div>

          {/* Right: Payment Info */}
          <div className="space-y-4">
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <p className="text-xs font-medium text-slate-400 mb-2">Total Amount</p>
              <p className="text-2xl font-bold text-slate-200">{formatCurrency(invoice.total_amount)}</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
              <p className="text-xs font-medium text-slate-400 mb-2">Paid Amount</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(invoice.paid_amount)}</p>
            </div>
            <div className={`rounded-lg p-4 border ${
              invoice.outstanding > 0
                ? 'bg-orange-500/10 border-orange-500/30'
                : 'bg-green-500/10 border-green-500/30'
            }`}>
              <p className="text-xs font-medium text-slate-400 mb-2">Outstanding</p>
              <p className={`text-2xl font-bold ${
                invoice.outstanding > 0 ? 'text-orange-400' : 'text-green-400'
              }`}>
                {formatCurrency(invoice.outstanding)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
