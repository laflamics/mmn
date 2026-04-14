import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cacheManager } from '../lib/cache';
import { formatDate, formatCurrency } from '../lib/formatters';
import { printPurchaseOrder } from '../lib/printPO';
import POTemplate from '../../pdf/POTemplate';
import PurchasingOrderDialog from '../components/PurchasingOrderDialog';
import ReceiveItemDialog from '../components/ReceiveItemDialog';
import FilterBar from '../components/FilterBar';
import Table from '../components/Table';

export default function Purchasing() {
  const [orders, setOrders] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [selectedOrderForReceive, setSelectedOrderForReceive] = useState(null);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showPOPreview, setShowPOPreview] = useState(false);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [showSendPaymentDialog, setShowSendPaymentDialog] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [preFilledReminder, setPreFilledReminder] = useState(null);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);

  useEffect(() => {
    fetchCompanySettings();
    fetchOrders();
    fetchReminders();
    
    return () => {
      cacheManager.clearAll();
    };
  }, []);

  // Filter and search effect
  useEffect(() => {
    let filtered = [...orders];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.po_number?.toLowerCase().includes(term) ||
        order.supplier_name?.toLowerCase().includes(term)
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') {
        filtered = filtered.filter(order => {
          const date = new Date(order.order_date);
          date.setHours(0, 0, 0, 0);
          return date.getTime() === today.getTime();
        });
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(order => {
          const date = new Date(order.order_date);
          date.setHours(0, 0, 0, 0);
          return date >= weekAgo && date <= today;
        });
      } else if (dateFilter === 'this_month') {
        // This month: from 1st of current month to today
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        
        filtered = filtered.filter(order => {
          const date = new Date(order.order_date);
          date.setHours(0, 0, 0, 0);
          return date.getFullYear() === currentYear && 
                 date.getMonth() === currentMonth && 
                 date >= firstDayOfMonth && 
                 date <= today;
        });
      } else if (dateFilter === 'last_month') {
        // Last month: entire previous month
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        
        // Calculate previous month
        let lastMonthYear = currentYear;
        let lastMonthNum = currentMonth - 1;
        if (lastMonthNum < 0) {
          lastMonthNum = 11;
          lastMonthYear = currentYear - 1;
        }
        
        const firstDayOfLastMonth = new Date(lastMonthYear, lastMonthNum, 1);
        firstDayOfLastMonth.setHours(0, 0, 0, 0);
        
        const lastDayOfLastMonth = new Date(lastMonthYear, lastMonthNum + 1, 0);
        lastDayOfLastMonth.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(order => {
          const date = new Date(order.order_date);
          date.setHours(0, 0, 0, 0);
          return date.getFullYear() === lastMonthYear && 
                 date.getMonth() === lastMonthNum;
        });
      } else if (dateFilter === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(order => {
          const date = new Date(order.order_date);
          return date >= start && date <= end;
        });
      }
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, dateFilter, startDate, endDate]);

  const fetchCompanySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setCompanySettings(data);
      }
    } catch (err) {
      console.log('No company settings found');
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error: err } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(name, address, phone, email, contact_person, plafond_limit, plafond_used),
          purchase_order_items(
            id,
            quantity,
            unit_price,
            total_price,
            products(id, name, sku)
          )
        `)
        .order('order_date', { ascending: false });
      
      if (err) throw err;

      // Batch fetch all user IDs
      const userIds = [...new Set(data.map(o => o.created_by).filter(Boolean))];
      let userMap = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);
        
        users?.forEach(u => {
          userMap[u.id] = u.name;
        });
      }

      // Batch fetch all PO item IDs for received quantities
      const poItemIds = data.flatMap(o => (o.purchase_order_items || []).map(i => i.id));
      let receivedMap = {};
      if (poItemIds.length > 0) {
        try {
          const { data: received } = await supabase
            .from('po_receive_items')
            .select('purchase_order_item_id, quantity_received')
            .in('purchase_order_item_id', poItemIds);
          
          received?.forEach(r => {
            receivedMap[r.purchase_order_item_id] = r.quantity_received;
          });
        } catch (err) {
          // Table might not exist
        }
      }

      // Batch fetch all payment records with paid_amount and discount
      const orderIds = data.map(o => o.id);
      let paymentMap = {};
      if (orderIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select('purchase_order_id, paid_amount, discount')
          .in('purchase_order_id', orderIds)
          .eq('payment_type', 'ap');
        
        payments?.forEach(p => {
          paymentMap[p.purchase_order_id] = {
            paid_amount: p.paid_amount || 0,
            discount: p.discount || 0,
            payment_sent: true
          };
        });
      }

      // Map all data together
      const ordersWithData = data.map(order => {
        const paymentData = paymentMap[order.id] || { paid_amount: 0, discount: 0, payment_sent: false };
        return {
          ...order,
          supplier_name: order.suppliers.name,
          plafond_limit: order.suppliers.plafond_limit || 0,
          plafond_used: order.suppliers.plafond_used || 0,
          created_by_name: order.created_by ? (userMap[order.created_by] || 'Unknown') : 'Unknown',
          purchase_order_items: (order.purchase_order_items || []).map(item => ({
            ...item,
            quantity_received: receivedMap[item.id] || 0
          })),
          paid_amount: paymentData.paid_amount,
          discount: paymentData.discount,
          payment_sent: paymentData.payment_sent
        };
      });

      setOrders(ordersWithData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const { data, error: err } = await supabase
        .from('purchasing_reminders')
        .select('*')
        .eq('status', 'pending')
        .order('id', { ascending: false });
      
      if (err) throw err;

      // Fetch product details separately
      if (data && data.length > 0) {
        const productIds = data.map(r => r.product_id);
        const { data: products } = await supabase
          .from('products')
          .select('id, sku, name, category')
          .in('id', productIds);

        const productMap = {};
        products?.forEach(p => {
          productMap[p.id] = p;
        });

        const remindersWithProducts = data.map(reminder => ({
          ...reminder,
          products: productMap[reminder.product_id] || {}
        }));

        setReminders(remindersWithProducts);
      } else {
        setReminders(data);
      }
    } catch (err) {
      console.error('Error fetching reminders:', err);
    }
  };

  const handleAcknowledgeReminder = async (reminderId) => {
    try {
      const { error: err } = await supabase
        .from('purchasing_reminders')
        .update({ status: 'acknowledged' })
        .eq('id', reminderId);
      
      if (err) throw err;
      fetchReminders();
    } catch (err) {
      console.error('Error acknowledging reminder:', err);
      setError(`Failed to acknowledge reminder: ${err.message}`);
    }
  };

  const handleCreatePOFromReminder = async (reminder) => {
    try {
      // Pre-fill the dialog with reminder data
      setPreFilledReminder(reminder);
      setShowDialog(true);
      
      // Acknowledge the reminder
      await handleAcknowledgeReminder(reminder.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleViewItems = (items) => {
    setSelectedOrderItems(items);
    setShowItemsModal(true);
  };

  const handleEditClick = (order) => {
    setEditingOrder(order);
    setShowDialog(true);
  };

  const handleDeleteClick = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        // Get order details
        const { data: order, error: orderErr } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('id', orderId)
          .single();
        if (orderErr) throw orderErr;

        // Update supplier plafond_used (reduce it)
        const { data: supplier, error: suppFetchErr } = await supabase
          .from('suppliers')
          .select('plafond_used')
          .eq('id', order.supplier_id)
          .single();
        if (suppFetchErr) throw suppFetchErr;

        const newPlafondUsed = Math.max(0, (supplier.plafond_used || 0) - (order.total_amount || 0));

        const { error: suppUpdateErr } = await supabase
          .from('suppliers')
          .update({ plafond_used: newPlafondUsed })
          .eq('id', order.supplier_id);
        if (suppUpdateErr) throw suppUpdateErr;

        // Delete order items first (due to foreign key constraint)
        const { error: itemsDeleteErr } = await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', orderId);
        if (itemsDeleteErr) throw itemsDeleteErr;

        // Delete order
        const { error: deleteError } = await supabase
          .from('purchase_orders')
          .delete()
          .eq('id', orderId);
        if (deleteError) throw deleteError;

        setError('');
        fetchOrders();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleOrderSubmit = () => {
    setEditingOrder(null);
    setPreFilledReminder(null);
    fetchOrders();
  };

  const handlePrintPO = (order) => {
    setPreviewOrder(order);
    setShowPOPreview(true);
  };

  const handleReceiveClick = (order) => {
    setSelectedOrderForReceive(order);
    setShowReceiveDialog(true);
  };

  const handleReceiveSubmit = () => {
    setShowReceiveDialog(false);
    setSelectedOrderForReceive(null);
    fetchOrders();
  };

  const handleSendToPayment = (order) => {
    setSelectedOrderForPayment(order);
    setShowSendPaymentDialog(true);
  };

  const calculateReceivedTotal = (items) => {
    return items.reduce((sum, item) => {
      const received = item.quantity_received || 0;
      const unitPrice = item.unit_price || 0;
      return sum + (received * unitPrice);
    }, 0);
  };

  const handleConfirmSendPayment = async () => {
    try {
      if (!selectedOrderForPayment) return;

      const items = selectedOrderForPayment.purchase_order_items || [];
      const receivedTotal = calculateReceivedTotal(items);

      // Create payment record
      const { data: paymentData, error: paymentErr } = await supabase
        .from('payments')
        .insert({
          invoice_id: null,
          purchase_order_id: selectedOrderForPayment.id,
          supplier_id: selectedOrderForPayment.supplier_id,
          amount: receivedTotal,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'pending',
          reference_number: selectedOrderForPayment.po_number,
          status: 'pending',
          payment_type: 'ap',
          notes: `Payment for received items from PO ${selectedOrderForPayment.po_number}`
        })
        .select();

      if (paymentErr) throw paymentErr;

      const paymentId = paymentData[0].id;

      // Insert payment items
      const paymentItems = items.map(item => ({
        payment_id: paymentId,
        purchase_order_item_id: item.id,
        product_id: item.products.id,
        product_name: item.products.name,
        product_sku: item.products.sku,
        quantity_ordered: item.quantity,
        quantity_received: item.quantity_received || 0,
        unit_price: item.unit_price,
        total_price: (item.quantity_received || 0) * item.unit_price
      }));

      const { error: itemsErr } = await supabase
        .from('payment_items')
        .insert(paymentItems);

      if (itemsErr) throw itemsErr;

      setError('');
      setShowSendPaymentDialog(false);
      setSelectedOrderForPayment(null);
      alert('Payment record created successfully with all items!');
      fetchOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.notification-bell-container')) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/30 text-yellow-200',
      confirmed: 'bg-blue-500/30 text-blue-200',
      received: 'bg-green-500/30 text-green-200',
      cancelled: 'bg-red-500/30 text-red-200',
    };
    return colors[status] || 'bg-slate-500/30 text-slate-200';
  };

  const columns = [
    { key: 'po_number', label: 'PO #', width: '7%' },
    { key: 'supplier_name', label: 'Supplier', width: '12%' },
    { 
      key: 'created_by_name', 
      label: 'PIC', 
      width: '10%'
    },
    { 
      key: 'order_date', 
      label: 'Date', 
      width: '8%',
      render: (val) => formatDate(val)
    },
    { 
      key: 'items', 
      label: 'Items', 
      width: '16%',
      render: (_, row) => {
        if (!row.purchase_order_items || row.purchase_order_items.length === 0) {
          return '-';
        }
        const firstItem = row.purchase_order_items[0];
        const hasMore = row.purchase_order_items.length > 1;
        return (
          <div className="text-xs space-y-2">
            <div className="text-slate-300">
              <div>{firstItem.products.name}</div>
              <div className="text-slate-400">
                {firstItem.quantity} pcs
              </div>
            </div>
            {hasMore && (
              <button
                onClick={() => handleViewItems(row.purchase_order_items)}
                className="text-blue-400 hover:text-blue-300 text-xs font-medium"
              >
                +{row.purchase_order_items.length - 1} more
              </button>
            )}
          </div>
        );
      }
    },
    { 
      key: 'quantity_received', 
      label: 'Received', 
      width: '7%',
      render: (val) => <span className="text-blue-400 font-medium">{val || 0}</span>
    },
    { 
      key: 'receive_date', 
      label: 'Receive Date', 
      width: '8%',
      render: (val) => val ? new Date(val).toLocaleDateString('id-ID') : '-'
    },
    { key: 'total_amount', label: 'Amount', width: '8%', render: (val) => formatCurrency(val) },
    { key: 'discount', label: 'Discount', width: '8%', render: (val) => formatCurrency(val || 0) },
    { key: 'paid_amount', label: 'Paid', width: '10%', render: (val) => formatCurrency(val || 0) },
    { 
      key: 'plafond_remaining', 
      label: 'Plafond Remaining', 
      width: '12%',
      render: (_, row) => {
        const remaining = (row.plafond_limit || 0) - (row.plafond_used || 0);
        const color = remaining < 0 ? 'text-red-400' : 'text-green-400';
        return <span className={color}>{formatCurrency(remaining)}</span>;
      }
    },
    { 
      key: 'payment_type', 
      label: 'Payment Type', 
      width: '10%',
      render: (val, row) => (
        <span className="text-xs font-medium text-slate-300">
          {val === 'TOP' ? `TOP ${row.top_days || 30}d` : val}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '7%',
      render: (val) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(val)}`}>
          {val}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '10%',
      render: (_, row) => {
        const hasPayment = row.payment_sent || false;
        return (
          <div className="flex gap-1 flex-col">
            <button
              onClick={() => handleReceiveClick(row)}
              className="px-2 py-1 text-xs bg-purple-500/30 text-purple-200 hover:bg-purple-500/50 rounded transition-smooth font-medium"
            >
              Receive
            </button>
            <button
              onClick={() => handleSendToPayment(row)}
              disabled={hasPayment}
              className={`px-2 py-1 text-xs rounded transition-smooth font-medium ${
                hasPayment
                  ? 'bg-gray-500/30 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500/30 text-green-200 hover:bg-green-500/50'
              }`}
            >
              {hasPayment ? '✓ Sent' : 'Send Payment'}
            </button>
            <button
              onClick={() => handlePrintPO(row)}
              className="px-2 py-1 text-xs bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 rounded transition-smooth font-medium"
            >
              Print
            </button>
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
        );
      }
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Purchase Orders</h1>
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="notification-bell-container relative">
            <button 
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              className="relative p-2 text-slate-400 hover:text-white transition-smooth"
            >
              <span className="text-2xl">🔔</span>
              {reminders.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {reminders.length > 9 ? '9+' : reminders.length}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotificationDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-lg shadow-lg border border-slate-700 z-50">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="text-white font-semibold">Stock Shortage Alerts</h3>
                </div>

                {reminders.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    No pending alerts
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {reminders.map((notif) => (
                      <div key={notif.id} className="p-4 border-b border-slate-700 hover:bg-slate-700/50 transition-smooth">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">{notif.products.name}</p>
                            <p className="text-slate-400 text-xs">
                              SKU: {notif.products.sku}
                            </p>
                            <p className="text-orange-300 text-xs font-semibold mt-1">
                              Shortage: {notif.shortage_qty} {notif.uom}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-col">
                            <button
                              onClick={() => {
                                handleCreatePOFromReminder(notif);
                                setShowNotificationDropdown(false);
                              }}
                              className="px-2 py-1 bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded text-xs font-medium transition-smooth whitespace-nowrap"
                            >
                              Create PO
                            </button>
                            <button
                              onClick={() => {
                                handleAcknowledgeReminder(notif.id);
                              }}
                              className="px-2 py-1 bg-orange-500/30 text-orange-200 hover:bg-orange-500/50 rounded text-xs font-medium transition-smooth whitespace-nowrap"
                            >
                              Ack
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={() => setShowDialog(true)}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-smooth font-medium"
          >
            + Create PO
          </button>
        </div>
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

      <PurchasingOrderDialog
        isOpen={showDialog}
        onClose={() => {
          setShowDialog(false);
          setPreFilledReminder(null);
        }}
        onSubmit={handleOrderSubmit}
        editingOrder={editingOrder}
        preFilledReminder={preFilledReminder}
      />

      <ReceiveItemDialog
        isOpen={showReceiveDialog}
        onClose={() => setShowReceiveDialog(false)}
        onSubmit={handleReceiveSubmit}
        purchaseOrder={selectedOrderForReceive}
      />

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-slate-400">
            Showing {filteredOrders.length} of {orders.length} purchase orders
          </div>
          <Table columns={columns} data={filteredOrders} rowsPerPage={pageSize} />
        </>
      )}

      {/* Items Detail Modal */}
      {showItemsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-slate-700 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Purchase Order Items</h2>
              <button
                onClick={() => setShowItemsModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {selectedOrderItems.map((item, idx) => {
                const ordered = item.quantity;
                const received = item.quantity_received || 0;
                const diff = received - ordered;
                const diffColor = diff > 0 ? 'text-orange-400' : diff < 0 ? 'text-red-400' : 'text-green-400';
                
                return (
                  <div key={idx} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-slate-400">Product</p>
                        <p className="text-white font-medium">{item.products.name}</p>
                        <p className="text-xs text-slate-400 mt-1">SKU: {item.products.sku}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Unit Price</p>
                        <p className="text-white font-medium">{formatCurrency(item.unit_price)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400">Ordered</p>
                        <p className="text-white font-semibold">{ordered}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Received</p>
                        <p className="text-blue-400 font-semibold">{received}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Diff</p>
                        <p className={`font-semibold ${diffColor}`}>{diff > 0 ? '+' : ''}{diff}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Total</p>
                        <p className="text-white font-semibold">{formatCurrency(received * item.unit_price)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
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

      {/* PO Preview Modal */}
      {showPOPreview && previewOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-300">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Purchase Order Preview</h2>
              <button
                onClick={() => setShowPOPreview(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* PO Content */}
            <div className="p-8">
              <POTemplate 
                order={previewOrder}
                supplier={{
                  name: previewOrder.supplier_name,
                  address: previewOrder.suppliers?.address || '',
                  contact_person: previewOrder.suppliers?.contact_person || '',
                  phone: previewOrder.suppliers?.phone || '',
                  email: previewOrder.suppliers?.email || '',
                  plafond_limit: previewOrder.plafond_limit
                }}
                items={previewOrder.purchase_order_items || []}
                company={companySettings || {}}
              />
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowPOPreview(false)}
                className="px-4 py-2 bg-slate-200 text-slate-900 hover:bg-slate-300 rounded-lg transition-smooth font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const supplier = {
                    name: previewOrder.supplier_name,
                    address: previewOrder.suppliers?.address || '',
                    contact_person: previewOrder.suppliers?.contact_person || '',
                    phone: previewOrder.suppliers?.phone || '',
                    email: previewOrder.suppliers?.email || '',
                    plafond_limit: previewOrder.plafond_limit
                  };
                  printPurchaseOrder(previewOrder, supplier, previewOrder.purchase_order_items || [], companySettings || {});
                }}
                className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-smooth font-medium"
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send to Payment Dialog */}
      {showSendPaymentDialog && selectedOrderForPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Send to Payment</h2>
              <button
                onClick={() => setShowSendPaymentDialog(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400 mb-1">PO Number</p>
                <p className="text-white font-semibold">{selectedOrderForPayment.po_number}</p>
              </div>

              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400 mb-1">Supplier</p>
                <p className="text-white font-semibold">{selectedOrderForPayment.supplier_name}</p>
              </div>

              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400 mb-1">Payment Amount (Based on Received Items)</p>
                <p className="text-green-400 font-bold text-lg">
                  {formatCurrency(calculateReceivedTotal(selectedOrderForPayment.purchase_order_items || []))}
                </p>
              </div>

              <div className="bg-orange-500/20 border border-orange-500/30 p-3 rounded-lg">
                <p className="text-xs text-orange-200">
                  ⚠️ This will create a payment record based on the actual received quantity, not the original PO amount.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSendPaymentDialog(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-200 hover:bg-slate-600 rounded-lg transition-smooth font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSendPayment}
                className="flex-1 px-4 py-2 bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded-lg transition-smooth font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
