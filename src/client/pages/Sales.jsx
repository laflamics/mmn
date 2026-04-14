import { useEffect, useState } from 'react';
import { cacheManager } from '../lib/cache';
import { formatDate, formatCurrency } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import SalesOrderDialog from '../components/SalesOrderDialog';
import FilterBar from '../components/FilterBar';
import Table from '../components/Table';
import InvoiceTemplate from '../../pdf/InvoiceTemplate';

export default function Sales() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [showStockWarningModal, setShowStockWarningModal] = useState(false);
  const [stockWarningItems, setStockWarningItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, startDate, endDate, pageSize]);

  useEffect(() => {
    fetchOrders(currentPage);
    fetchCompanySettings();
    
    return () => {
      cacheManager.clearAll();
    };
  }, [currentPage, searchTerm, dateFilter, startDate, endDate, pageSize]);

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

  const fetchOrders = async (page) => {
    try {
      setLoading(true);
      let query = supabase
        .from('sales_orders')
        .select(`
          id,
          order_number,
          order_date,
          total_amount,
          tax_amount,
          discount_amount,
          status,
          payment_type,
          created_by,
          customer_id,
          customers(id, name, plafond_limit, plafond_used, sales_person),
          sales_order_items(id, quantity, product_id, unit_price)
        `, { count: 'exact' });

      // Apply date filter
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      if (dateFilter === 'this_month') {
        query = query.gte('order_date', currentMonth.toISOString().split('T')[0]);
      } else if (dateFilter === 'last_month') {
        query = query.gte('order_date', lastMonthStart.toISOString().split('T')[0])
                     .lte('order_date', lastMonthEnd.toISOString().split('T')[0]);
      } else if (dateFilter === 'custom' && startDate && endDate) {
        query = query.gte('order_date', startDate)
                     .lte('order_date', endDate);
      }

      const { data: allOrders, error } = await query
        .order('order_date', { ascending: false });

      if (error) throw error;

      // Client-side filtering for search and customer type
      let filtered = allOrders;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(order => 
          order.order_number?.toLowerCase().includes(term) ||
          order.customers?.name?.toLowerCase().includes(term)
        );
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const paginatedOrders = filtered.slice(from, to + 1);

      // Batch fetch products and users
      const productIds = [...new Set(paginatedOrders.flatMap(o => o.sales_order_items?.map(i => i.product_id) || []))];
      const userIds = [...new Set(paginatedOrders.map(o => o.created_by).filter(Boolean))];

      const [productsResult, usersResult, inventoryResult] = await Promise.all([
        productIds.length > 0 
          ? supabase.from('products').select('id, name, uom').in('id', productIds)
          : Promise.resolve({ data: [] }),
        userIds.length > 0 
          ? supabase.from('users').select('id, name').in('id', userIds)
          : Promise.resolve({ data: [] }),
        productIds.length > 0
          ? supabase.from('inventory').select('product_id, quantity_available').in('product_id', productIds)
          : Promise.resolve({ data: [] })
      ]);

      const productsMap = {};
      productsResult.data?.forEach(p => { productsMap[p.id] = p; });

      const usersMap = {};
      usersResult.data?.forEach(u => { usersMap[u.id] = u.name; });

      const inventoryMap = {};
      inventoryResult.data?.forEach(inv => { inventoryMap[inv.product_id] = inv.quantity_available || 0; });

      const mappedOrders = paginatedOrders.map(order => {
        let orderHasStockIssue = false;
        
        const itemsWithProducts = (order.sales_order_items || []).map(item => {
          const product = productsMap[item.product_id] || {};
          const availableStock = inventoryMap[item.product_id] || 0;
          
          let itemStockStatus = 'in_stock';
          if (availableStock <= 0) {
            itemStockStatus = 'backorder';
            orderHasStockIssue = true;
          } else if (availableStock < item.quantity) {
            itemStockStatus = 'partial';
            orderHasStockIssue = true;
          }
          
          return {
            ...item,
            product_name: product.name || 'Unknown',
            uom: product.uom || '',
            available_stock: availableStock,
            stock_status: itemStockStatus
          };
        });

        return {
          ...order,
          customer_name: order.customers?.name || 'Unknown',
          plafond_limit: order.customers?.plafond_limit || 0,
          plafond_used: order.customers?.plafond_used || 0,
          created_by_name: usersMap[order.created_by] || order.created_by || order.customers?.sales_person || 'Unknown',
          sales_order_items: itemsWithProducts,
          stock_status: orderHasStockIssue ? 'partial' : 'in_stock'
        };
      });

      setOrders(mappedOrders);
      setTotalCount(filtered.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = async () => {
    setEditingOrder(null);
    setShowDialog(true);
  };

  const handleEditClick = (order) => {
    setEditingOrder(order);
    setShowDialog(true);
  };

  const handleDeleteClick = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this sales order?')) {
      try {
        // Get order details
        const { data: order, error: orderErr } = await supabase
          .from('sales_orders')
          .select('*')
          .eq('id', orderId)
          .single();
        if (orderErr) {
          console.error('Error fetching order:', orderErr);
          throw orderErr;
        }

        // Update customer plafond_used (reduce it)
        const { data: customer, error: custFetchErr } = await supabase
          .from('customers')
          .select('plafond_used')
          .eq('id', order.customer_id)
          .single();
        if (custFetchErr) {
          console.error('Error fetching customer:', custFetchErr);
          throw custFetchErr;
        }

        const newPlafondUsed = Math.max(0, (customer.plafond_used || 0) - (order.total_amount || 0));

        const { error: custUpdateErr } = await supabase
          .from('customers')
          .update({ plafond_used: newPlafondUsed })
          .eq('id', order.customer_id);
        if (custUpdateErr) {
          console.error('Error updating customer plafond:', custUpdateErr);
          throw custUpdateErr;
        }

        // Delete order items first (due to foreign key constraint)
        const { error: itemsDeleteErr } = await supabase
          .from('sales_order_items')
          .delete()
          .eq('sales_order_id', orderId);
        if (itemsDeleteErr) {
          console.error('Error deleting order items:', itemsDeleteErr);
          throw itemsDeleteErr;
        }

        // Delete order
        const { error: deleteError } = await supabase
          .from('sales_orders')
          .delete()
          .eq('id', orderId);
        if (deleteError) {
          console.error('Error deleting order:', deleteError);
          throw deleteError;
        }
        setError('');
        setCurrentPage(1);
        fetchOrders(1);
      } catch (err) {
        console.error('Delete error:', err);
        setError(err.message);
      }
    }
  };

  const handleOrderSubmit = () => {
    setCurrentPage(1);
    fetchOrders(1);
  };

  const handleViewItems = (items) => {
    setSelectedOrderItems(items);
    setShowItemsModal(true);
  };

  const handleViewStockWarning = (items) => {
    const warningItems = items.filter(item => item.stock_status !== 'in_stock');
    setStockWarningItems(warningItems);
    setShowStockWarningModal(true);
  };

  const handleRemindPurchasing = async () => {
    try {
      if (!stockWarningItems || stockWarningItems.length === 0) {
        setError('No items to remind');
        return;
      }

      // Create reminders directly in database
      const reminders = stockWarningItems.map(item => {
        const shortage = Math.max(0, item.quantity - (item.available_stock || 0));
        return {
          product_id: item.product_id,
          shortage_qty: parseFloat(shortage.toFixed(2)),
          uom: item.uom || 'pcs',
          status: 'pending',
        };
      });

      const { data, error } = await supabase
        .from('purchasing_reminders')
        .insert(reminders)
        .select();

      if (error) throw error;

      setError('');
      alert(`Reminder sent successfully! (${data?.length || reminders.length} items)`);
      setShowStockWarningModal(false);
    } catch (err) {
      const errorMsg = err.message || 'Failed to send reminder. Please check your connection and try again.';
      console.error('Error:', errorMsg);
      setError(errorMsg);
    }
  };

  const handlePreviewInvoice = async (order) => {
    try {
      // Fetch invoice data untuk order ini
      const { data: invoice, error: invoiceErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('sales_order_id', order.id)
        .single();

      if (invoiceErr && invoiceErr.code !== 'PGRST116') {
        throw invoiceErr;
      }

      if (!invoice) {
        setError('No invoice found for this sales order');
        return;
      }

      // Fetch invoice items dari sales_order_items
      const { data: soItems, error: soErr } = await supabase
        .from('sales_order_items')
        .select(`
          id,
          quantity,
          unit_price,
          products(name)
        `)
        .eq('sales_order_id', order.id);

      if (soErr) throw soErr;

      const items = (soItems || []).map(item => ({
        ...item,
        product_name: item.products?.name || 'Unknown'
      }));

      const invoiceWithData = {
        ...invoice,
        customers: order.customers,
        items,
        tax_amount: invoice.tax_amount || 0,
        discount_amount: invoice.discount_amount || 0,
        payment_terms: 'NET 30',
        notes: invoice.notes || ''
      };

      setPreviewInvoice(invoiceWithData);
      setShowInvoicePreview(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePrintInvoice = async () => {
    try {
      const { printInvoice } = await import('../lib/printInvoice');
      const items = previewInvoice.items || [];
      printInvoice(previewInvoice, items, companyData || {});
    } catch (err) {
      setError(err.message);
    }
  };

  const handleProcessOrder = async (orderId) => {
    if (window.confirm('Process this order? This will reserve inventory items.')) {
      try {
        // Update order status directly
        const { error } = await supabase
          .from('sales_orders')
          .update({ status: 'confirmed' })
          .eq('id', orderId);

        if (error) throw error;

        setError('');
        fetchOrders();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-300 text-black',
      confirmed: 'bg-blue-300 text-black',
      shipped: 'bg-purple-300 text-black',
      delivered: 'bg-green-300 text-black',
      cancelled: 'bg-red-300 text-black',
    };
    return colors[status] || 'bg-slate-300 text-black';
  };

  const columns = [
    { key: 'order_number', label: 'Order #', width: '7%' },
    { key: 'customer_name', label: 'Customer', width: '11%' },
    { 
      key: 'created_by_name', 
      label: 'Sales By', 
      width: '10%'
    },
    { 
      key: 'order_date', 
      label: 'Date', 
      width: '7%',
      render: (val) => formatDate(val)
    },
    { 
      key: 'items_count', 
      label: 'Items', 
      width: '18%',
      render: (_, row) => {
        if (!row.sales_order_items || row.sales_order_items.length === 0) {
          return '-';
        }
        const firstItem = row.sales_order_items[0];
        const hasMore = row.sales_order_items.length > 1;
        return (
          <div className="text-xs space-y-2">
            <div className="text-slate-300">
              <div>{firstItem.product_name}</div>
              <div className="text-slate-400">
                {firstItem.quantity} {firstItem.uom || 'pcs'}
              </div>
            </div>
            {hasMore && (
              <button
                onClick={() => handleViewItems(row.sales_order_items)}
                className="text-blue-400 hover:text-blue-300 text-xs font-medium"
              >
                +{row.sales_order_items.length - 1} more
              </button>
            )}
          </div>
        );
      }
    },
    { 
      key: 'subtotal', 
      label: 'Subtotal', 
      width: '9%',
      render: (_, row) => {
        const subtotal = row.total_amount - (row.tax_amount || 0) + (row.discount_amount || 0);
        return formatCurrency(subtotal);
      }
    },
    { 
      key: 'tax_amount', 
      label: 'Tax', 
      width: '5%',
      render: (val) => val ? formatCurrency(val) : '-'
    },
    { 
      key: 'discount_amount', 
      label: 'Discount', 
      width: '7%',
      render: (val) => val ? formatCurrency(val) : '-'
    },
    { key: 'total_amount', label: 'Total', width: '9%', render: (val) => formatCurrency(val) },
    { 
      key: 'plafond_remaining', 
      label: 'Plafond Remaining', 
      width: '11%',
      render: (_, row) => {
        const remaining = (row.plafond_limit || 0) - (row.plafond_used || 0);
        const color = remaining < 0 ? 'text-red-400' : 'text-green-400';
        return <span className={color}>{formatCurrency(remaining)}</span>;
      }
    },
    { 
      key: 'payment_type', 
      label: 'Payment', 
      width: '5%',
      render: (val) => val || 'COD'
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '6%',
      render: (val) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(val)}`}>
          {val}
        </span>
      )
    },
    { 
      key: 'stock_status', 
      label: 'Stock Status', 
      width: '8%',
      render: (val, row) => {
        const colors = {
          in_stock: 'bg-green-300 text-black',
          partial: 'bg-yellow-300 text-black',
          backorder: 'bg-red-300 text-black'
        };
        const labels = {
          in_stock: 'In Stock',
          partial: 'Partial',
          backorder: 'Backorder'
        };
        return (
          <button
            onClick={() => handleViewStockWarning(row.sales_order_items)}
            className={`px-2 py-1 rounded text-xs font-semibold ${colors[val] || colors.in_stock} hover:opacity-80 transition-smooth`}
          >
            {labels[val] || 'Unknown'}
          </button>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '8%',
      render: (_, row) => (
        <div className="flex gap-1 flex-col">
          <button
            onClick={() => handlePreviewInvoice(row)}
            className="px-2 py-1 text-xs bg-purple-500/30 text-purple-200 hover:bg-purple-500/50 rounded transition-smooth font-medium"
          >
            Invoice
          </button>
          <button
            onClick={() => handleProcessOrder(row.id)}
            className="px-2 py-1 text-xs bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded transition-smooth font-medium"
          >
            Process
          </button>
          <button
            onClick={() => handleEditClick(row)}
            className="px-2 py-1 text-xs bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded transition-smooth font-medium"
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
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-3 sm:mb-4 md:mb-6 lg:mb-8">
        <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold gradient-text">Sales Orders</h1>
        <button 
          onClick={handleCreateClick}
          className="px-2 sm:px-3 md:px-4 lg:px-6 py-1 sm:py-1.5 md:py-2 lg:py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium text-xs sm:text-xs md:text-sm lg:text-base"
        >
          + Create Order
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
        searchPlaceholder="Order # or Customer"
        showCustomerTypeFilter={false}
      />

      <SalesOrderDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onSubmit={handleOrderSubmit}
        editingOrder={editingOrder}
      />

      {/* Items Detail Modal */}
      {showItemsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Order Items</h2>
              <button
                onClick={() => setShowItemsModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedOrderItems.map((item, idx) => (
                <div key={idx} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400">Product</p>
                      <p className="text-white font-medium">{item.product_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Quantity</p>
                      <p className="text-white font-medium">{item.quantity} {item.uom || 'pcs'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowItemsModal(false)}
              className="mt-4 w-full px-4 py-2 bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded-lg transition-smooth font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Stock Warning Modal */}
      {showStockWarningModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Stock Status</h2>
              <button
                onClick={() => setShowStockWarningModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stockWarningItems.map((item, idx) => {
                const shortage = item.quantity - item.available_stock;
                const statusColor = item.stock_status === 'partial' 
                  ? 'bg-yellow-500/20 border-yellow-500/30' 
                  : 'bg-red-500/20 border-red-500/30';
                const statusText = item.stock_status === 'partial' 
                  ? 'Partial Stock' 
                  : 'Out of Stock';
                
                return (
                  <div key={idx} className={`${statusColor} border p-4 rounded-lg`}>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <p className="text-xs text-slate-400">Product</p>
                        <p className="text-white font-medium">{item.product_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Status</p>
                        <p className={`font-medium ${item.stock_status === 'partial' ? 'text-yellow-300' : 'text-red-300'}`}>
                          {statusText}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">Need</p>
                        <p className="text-white font-medium">{item.quantity} {item.uom || 'pcs'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Available</p>
                        <p className="text-white font-medium">{item.available_stock} {item.uom || 'pcs'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Shortage</p>
                        <p className={`font-medium ${item.stock_status === 'partial' ? 'text-yellow-300' : 'text-red-300'}`}>
                          {shortage} {item.uom || 'pcs'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleRemindPurchasing}
                className="flex-1 px-4 py-2 bg-orange-500/30 text-orange-200 hover:bg-orange-500/50 rounded-lg transition-smooth font-medium"
              >
                Remind to Purchasing
              </button>
              <button
                onClick={() => setShowStockWarningModal(false)}
                className="flex-1 px-4 py-2 bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded-lg transition-smooth font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {showInvoicePreview && previewInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Preview Invoice</h2>
              <button
                onClick={() => setShowInvoicePreview(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Preview Content - Using InvoiceTemplate */}
            <div className="bg-white text-black p-6 rounded-lg mb-4 max-h-[60vh] overflow-y-auto">
              <InvoiceTemplate 
                invoice={previewInvoice}
                items={previewInvoice.items || []}
                company={companyData || {}}
              />
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
                onClick={() => setShowInvoicePreview(false)}
                className="flex-1 px-4 py-2 glass-sm text-cyan-300 hover:text-cyan-100 rounded-lg transition-smooth font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : (
        <>
          <Table columns={columns} data={orders} rowsPerPage={pageSize} />
          
          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <p className="text-slate-400 text-sm">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} orders
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
