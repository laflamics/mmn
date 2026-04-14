import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/formatters';
import { calculateTotal } from '../lib/api';
import Dialog from './Dialog';
import InvoiceTemplateRegular from '../../pdf/InvoiceTemplateRegular';

export default function SalesOrderDialog({ isOpen, onClose, onSubmit, editingOrder }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [showARDialog, setShowARDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [orderItems, setOrderItems] = useState([]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(0);
  const [globalNote, setGlobalNote] = useState('');
  const [paymentType, setPaymentType] = useState('COD');
  const [topDays, setTopDays] = useState(30);
  const [error, setError] = useState('');
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [productSearchByItem, setProductSearchByItem] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      fetchProducts();
      fetchCompanySettings();
      getCurrentUser();
      if (editingOrder) {
        loadEditingOrder();
      }
    }
  }, [isOpen, editingOrder]);

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

  const getCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setCurrentUser(user);
    } catch (err) {
      console.error('Error getting current user:', err);
    }
  };

  const loadEditingOrder = async () => {
    try {
      // Fetch customer info
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', editingOrder.customer_id)
        .single();
      if (custErr) throw custErr;

      // Fetch order items
      const { data: items, error: itemsErr } = await supabase
        .from('sales_order_items')
        .select('*')
        .eq('sales_order_id', editingOrder.id);
      if (itemsErr) throw itemsErr;

      setSelectedCustomer(editingOrder.customer_id);
      setCustomerInfo(customer);
      setCustomerSearch(customer.name);
      setUnpaidInvoices([]);
      
      // Fetch unpaid invoices via sales_orders relationship
      const { data: invoices, error: invErr } = await supabase
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
          sales_orders!inner(
            customer_id
          )
        `)
        .eq('sales_orders.customer_id', editingOrder.customer_id)
        .neq('status', 'paid')
        .order('due_date');
      if (invErr) throw invErr;
      setUnpaidInvoices(invoices || []);

      setOrderItems(items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price || 0,
        delivery_type: item.delivery_type || 'LOCCO',
        unit_type: item.unit_type || 'ZAK',
        payment_term: item.payment_term || 'CASH',
        note: item.notes || '',
        weight: item.weight || 30
      })));
      setTax(editingOrder.tax_amount || 0);
      setDiscount(editingOrder.discount_amount || 0);
      setSaving(editingOrder.saving_amount || 0);
      setGlobalNote(editingOrder.notes || '');
      setPaymentType(editingOrder.payment_type || 'COD');
      setTopDays(editingOrder.top_days || 30);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error: err } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (err) throw err;
      setCustomers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (err) throw err;
      setProducts(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Get applicable price for customer + product
  const getApplicablePriceForItem = async (customerId, productId) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return null;

      const customer = customers.find(c => c.id === customerId);
      if (!customer) return null;

      // For B2C, return B2C prices
      if (customer.customer_type === 'B2C') {
        return {
          type: 'B2C',
          locco_price: product.b2c_locco_price_zak || 0,
          franco_price: product.b2c_franco_price_zak || 0,
          weight: product.weight || 30
        };
      }

      // For B2B, check custom pricing first
      const { data: customPrice, error: err } = await supabase
        .from('customer_product_pricing')
        .select('custom_price')
        .eq('customer_id', customerId)
        .eq('product_id', productId)
        .single();

      if (!err && customPrice) {
        return {
          type: 'B2B_CUSTOM',
          price: customPrice.custom_price
        };
      }

      // Fallback to B2B default price
      return {
        type: 'B2B_DEFAULT',
        price: product.b2b_default_price || 0
      };
    } catch (err) {
      console.error('Error getting applicable price:', err);
      return null;
    }
  };

  const handleCustomerSelect = async (customerId) => {
    if (!customerId) {
      setSelectedCustomer(null);
      setCustomerInfo(null);
      setUnpaidInvoices([]);
      return;
    }

    try {
      // Fetch fresh customer data
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      if (custErr) throw custErr;

      setSelectedCustomer(customerId);
      setCustomerInfo(customer);
      setCustomerSearch(customer.name);
      setShowCustomerDropdown(false);

      // Fetch unpaid invoices - filter by customer_id directly
      const { data: invoices, error: invErr } = await supabase
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
          sales_orders!inner(
            customer_id
          )
        `)
        .eq('sales_orders.customer_id', customerId)
        .neq('status', 'paid')
        .order('due_date');
      
      if (invErr) throw invErr;

      setUnpaidInvoices(invoices || []);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const getFilteredCustomers = () => {
    if (!customerSearch) return customers;
    const search = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.phone?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.customer_code?.toLowerCase().includes(search)
    );
  };

  const getFilteredProducts = (searchTerm = '') => {
    if (!searchTerm) return products;
    const search = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.sku?.toLowerCase().includes(search) ||
      p.category?.toLowerCase().includes(search)
    );
  };

  const handleAddProduct = () => {
    setOrderItems([
      ...orderItems,
      { 
        product_id: '', 
        quantity: 0, 
        unit_price: 0, 
        total_price: 0,
        delivery_type: 'LOCCO',
        unit_type: 'ZAK',
        payment_term: 'CASH',
        note: '' 
      }
    ]);
  };

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...orderItems];
    const item = newItems[index];

    // Handle product selection - fetch applicable price
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        item.product_id = parseInt(value);
        item.weight = product.weight || 30;
        
        // For B2C, set default prices based on delivery type
        if (customerInfo?.type === 'B2C') {
          if (item.delivery_type === 'LOCCO') {
            item.unit_price = product.b2c_locco_price_zak || 0;
          } else {
            item.unit_price = product.b2c_franco_price_zak || 0;
          }
        } else if (customerInfo?.type === 'B2B') {
          // For B2B, check custom pricing first, then fallback to default
          supabase
            .from('customer_product_pricing')
            .select('custom_price')
            .eq('customer_id', selectedCustomer)
            .eq('product_id', parseInt(value))
            .single()
            .then(({ data: customPrice, error }) => {
              if (!error && customPrice) {
                // Custom price is per KG, convert based on unit_type
                const pricePerKg = customPrice.custom_price;
                if (item.unit_type === 'ZAK') {
                  item.unit_price = pricePerKg * (product.weight || 30);
                } else {
                  item.unit_price = pricePerKg;
                }
              } else {
                // Use default price (assume it's per ZAK)
                item.unit_price = product.b2b_default_price || 0;
              }
              if (item.quantity > 0) {
                item.total_price = calculateTotal(item.quantity, item.unit_price);
              }
              setOrderItems([...newItems]);
            });
          return; // Don't update items yet, wait for async fetch
        }
        
        // Auto-calculate total if quantity is set
        if (item.quantity > 0) {
          item.total_price = calculateTotal(item.quantity, item.unit_price);
        }
      }
    }
    
    // Handle quantity change - auto-calculate total
    else if (field === 'quantity') {
      item.quantity = Math.round(parseFloat(value) * 100) / 100 || 0;
      if (item.unit_price > 0) {
        item.total_price = calculateTotal(item.quantity, item.unit_price);
      }
    }
    
    // Handle unit_price change - auto-calculate total
    else if (field === 'unit_price') {
      item.unit_price = parseFloat(value) || 0;
      if (item.quantity > 0) {
        item.total_price = calculateTotal(item.quantity, item.unit_price);
      }
    }
    
    // Handle total_price change - auto-calculate quantity
    else if (field === 'total_price') {
      item.total_price = parseFloat(value) || 0;
      if (item.unit_price > 0) {
        item.quantity = Math.round((item.total_price / item.unit_price) * 100) / 100;
      }
    }
    
    // Handle delivery_type change (B2C only)
    else if (field === 'delivery_type' && customerInfo?.type === 'B2C') {
      item.delivery_type = value;
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        // Get base price based on delivery type
        const basePrice = value === 'LOCCO' 
          ? (product.b2c_locco_price_zak || 0)
          : (product.b2c_franco_price_zak || 0);
        
        // If unit_type is KG, convert price
        if (item.unit_type === 'KG') {
          const weight = product.weight || 30;
          item.unit_price = basePrice / weight;
        } else {
          item.unit_price = basePrice;
        }
        
        if (item.quantity > 0) {
          item.total_price = calculateTotal(item.quantity, item.unit_price);
        }
      }
    }
    
    // Handle unit_type change (B2C and B2B)
    else if (field === 'unit_type') {
      item.unit_type = value;
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        const weight = product.weight || 30;
        
        if (customerInfo?.type === 'B2C') {
          // Get base price based on delivery type
          const basePrice = item.delivery_type === 'LOCCO'
            ? (product.b2c_locco_price_zak || 0)
            : (product.b2c_franco_price_zak || 0);
          
          // Convert based on unit type
          if (value === 'KG') {
            item.unit_price = basePrice / weight;
          } else {
            item.unit_price = basePrice;
          }
        } else if (customerInfo?.type === 'B2B') {
          // For B2B, fetch custom price and convert
          supabase
            .from('customer_product_pricing')
            .select('custom_price')
            .eq('customer_id', selectedCustomer)
            .eq('product_id', item.product_id)
            .single()
            .then(({ data: customPrice, error }) => {
              if (!error && customPrice) {
                // Custom price is per KG
                const pricePerKg = customPrice.custom_price;
                if (value === 'ZAK') {
                  item.unit_price = pricePerKg * weight;
                } else {
                  item.unit_price = pricePerKg;
                }
              } else {
                // Use default price
                item.unit_price = product.b2b_default_price || 0;
              }
              if (item.quantity > 0) {
                item.total_price = calculateTotal(item.quantity, item.unit_price);
              }
              setOrderItems([...newItems]);
            });
          return;
        }
        
        if (item.quantity > 0) {
          item.total_price = calculateTotal(item.quantity, item.unit_price);
        }
      }
    }
    
    // Handle payment_term change (B2C only)
    else if (field === 'payment_term') {
      item.payment_term = value;
    }
    
    // Handle other fields
    else {
      item[field] = value;
    }

    setOrderItems(newItems);
  };

  const handleRemoveItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const subtotal = calculateSubtotal();
  const taxAmount = (subtotal * tax) / 100;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal + taxAmount - discountAmount + saving;

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer');
      return;
    }
    if (orderItems.length === 0) {
      setError('Please add at least one product');
      return;
    }

    try {
      // Check plafond blocking setting
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('enable_plafond_blocking')
        .single();

      const enablePlafondBlocking = companySettings?.enable_plafond_blocking || false;

      // Check if order would exceed plafond limit
      if (enablePlafondBlocking && customerInfo) {
        const newPlafondUsed = (customerInfo.plafond_used || 0) + total;
        if (newPlafondUsed > (customerInfo.plafond_limit || 0)) {
          const remaining = (customerInfo.plafond_limit || 0) - (customerInfo.plafond_used || 0);
          setError(`❌ Order blocked! Plafond limit exceeded. Remaining: ${formatCurrency(remaining)}, Order total: ${formatCurrency(total)}`);
          return;
        }
      }

      if (editingOrder) {
        // Calculate old and new amounts
        const oldAmount = editingOrder.total_amount || 0;
        const newAmount = total;
        const amountDifference = newAmount - oldAmount;

        // Update customer plafond_used
        const { data: customer, error: custFetchErr } = await supabase
          .from('customers')
          .select('plafond_used')
          .eq('id', selectedCustomer)
          .single();
        if (custFetchErr) throw custFetchErr;

        const newPlafondUsed = Math.max(0, (customer.plafond_used || 0) + amountDifference);

        const { error: custUpdateErr } = await supabase
          .from('customers')
          .update({ plafond_used: newPlafondUsed })
          .eq('id', selectedCustomer);
        if (custUpdateErr) throw custUpdateErr;

        // Update order
        const { error: updateErr } = await supabase
          .from('sales_orders')
          .update({
            total_amount: total,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            saving_amount: saving,
            payment_type: paymentType,
            top_days: paymentType === 'TOP' ? topDays : null,
            notes: globalNote
          })
          .eq('id', editingOrder.id);

        if (updateErr) throw updateErr;

        // Delete old items
        const { error: deleteErr } = await supabase
          .from('sales_order_items')
          .delete()
          .eq('sales_order_id', editingOrder.id);

        if (deleteErr) throw deleteErr;

        // Insert new items
        const itemsToInsert = orderItems.map(item => ({
          sales_order_id: editingOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price || (item.quantity * item.unit_price)
        }));

        const { error: itemsErr } = await supabase
          .from('sales_order_items')
          .insert(itemsToInsert);

        if (itemsErr) throw itemsErr;
      } else {
        // Create new order
        const orderNumber = `SO-${Date.now()}`;

        // Update customer plafond_used
        const { data: customer, error: custFetchErr } = await supabase
          .from('customers')
          .select('plafond_used')
          .eq('id', selectedCustomer)
          .single();
        if (custFetchErr) throw custFetchErr;

        const newPlafondUsed = (customer.plafond_used || 0) + total;

        const { error: custUpdateErr } = await supabase
          .from('customers')
          .update({ plafond_used: newPlafondUsed })
          .eq('id', selectedCustomer);
        if (custUpdateErr) throw custUpdateErr;

        const { data: order, error: orderErr } = await supabase
          .from('sales_orders')
          .insert([{
            order_number: orderNumber,
            customer_id: selectedCustomer,
            order_date: new Date().toISOString(),
            total_amount: total,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            saving_amount: saving,
            payment_type: paymentType,
            top_days: paymentType === 'TOP' ? topDays : null,
            notes: globalNote,
            status: 'pending',
            created_by: currentUser?.id
          }])
          .select();

        if (orderErr) throw orderErr;

        const itemsToInsert = orderItems.map(item => ({
          sales_order_id: order[0].id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price || (item.quantity * item.unit_price)
        }));

        const { error: itemsErr } = await supabase
          .from('sales_order_items')
          .insert(itemsToInsert);

        if (itemsErr) throw itemsErr;
      }

      onSubmit();
      handleClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClose = () => {
    setSelectedCustomer(null);
    setCustomerInfo(null);
    setUnpaidInvoices([]);
    setOrderItems([]);
    setTax(0);
    setDiscount(0);
    setSaving(0);
    setGlobalNote('');
    setPaymentType('COD');
    setTopDays(30);
    setError('');
    setShowARDialog(false);
    setShowInvoicePreview(false);
    setPreviewInvoice(null);
    onClose();
  };

  const handleInvoiceClick = async (invoice) => {
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
            tax_amount,
            discount_amount,
            notes,
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

      const invoiceWithData = {
        ...fullInvoice,
        customers: fullInvoice.sales_orders?.customers,
        tax_amount: fullInvoice.sales_orders?.tax_amount || 0,
        discount_amount: fullInvoice.sales_orders?.discount_amount || 0,
        notes: fullInvoice.sales_orders?.notes || '',
        payment_terms: fullInvoice.sales_orders?.payment_type || 'COD',
        items
      };

      setPreviewInvoice(invoiceWithData);
      setShowInvoicePreview(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <Dialog
        isOpen={isOpen && !showARDialog}
        title={editingOrder ? "Edit Sales Order" : "Create Sales Order"}
        onClose={handleClose}
        onSubmit={handleSubmit}
        submitLabel={editingOrder ? "Update Order" : "Create Order"}
      >
        <div className="flex flex-col gap-3">
          {error && <div className="p-2 bg-red-500/20 text-red-200 rounded-lg text-xs">{error}</div>}

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Customer *</label>
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  if (e.target.value === '') {
                    setSelectedCustomer(null);
                    setCustomerInfo(null);
                    setUnpaidInvoices([]);
                  }
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Search customer by name, phone, email..."
                className="w-full px-3 py-1.5 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
              />
              {showCustomerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {getFilteredCustomers().length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">No customers found</div>
                  ) : (
                    getFilteredCustomers().map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleCustomerSelect(c.id)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 text-xs text-slate-300 border-b border-slate-700/50 last:border-b-0"
                      >
                        <div className="font-medium text-white">{c.name}</div>
                        <div className="text-slate-400 text-xs">{c.phone} • {c.type}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          {customerInfo && (
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/30 p-2.5 rounded-lg border border-slate-700/50">
              <h3 className="text-xs font-semibold text-slate-200 mb-2">Customer Info</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/40 p-2 rounded">
                  <p className="text-xs text-slate-400">Plafond Limit</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(customerInfo.plafond_limit)}</p>
                </div>
                <div className="bg-slate-900/40 p-2 rounded">
                  <p className="text-xs text-slate-400">Plafond Remaining</p>
                  <p className={`text-sm font-bold ${(customerInfo.plafond_limit - customerInfo.plafond_used) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(customerInfo.plafond_limit - customerInfo.plafond_used)}
                  </p>
                </div>
                <div className="bg-slate-900/40 p-2 rounded">
                  <p className="text-xs text-slate-400">Plafond Used</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(customerInfo.plafond_used)}</p>
                </div>
                <div className="bg-slate-900/40 p-2 rounded">
                  <p className="text-xs text-slate-400">Unpaid</p>
                  <button
                    onClick={() => setShowARDialog(true)}
                    className="text-sm font-bold text-blue-400 hover:text-blue-300"
                  >
                    {formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0))}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products Section */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-300">Products</label>
              <button
                type="button"
                onClick={handleAddProduct}
                className="text-xs bg-blue-500/40 text-blue-200 hover:bg-blue-500/60 px-2 py-0.5 rounded font-medium"
              >
                + Add
              </button>
            </div>

            {orderItems.length === 0 ? (
              <div className="bg-slate-800/30 border border-dashed border-slate-600 p-2 rounded text-center">
                <p className="text-slate-400 text-xs">No products</p>
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-900/20 p-2 rounded border border-slate-700/30">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-800/60 p-2 rounded border border-slate-700/50 space-y-1">
                    {/* Product Selection Row */}
                    <div className="grid grid-cols-12 gap-1">
                      <div className="col-span-6 relative">
                        <input
                          type="text"
                          value={item.product_id ? products.find(p => p.id === item.product_id)?.name : (productSearchByItem[idx] || '')}
                          onChange={(e) => setProductSearchByItem({...productSearchByItem, [idx]: e.target.value})}
                          placeholder="Search product..."
                          className="w-full text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        {productSearchByItem[idx] && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg z-50 max-h-32 overflow-y-auto">
                            {getFilteredProducts(productSearchByItem[idx] || '').map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  handleUpdateItem(idx, 'product_id', p.id);
                                  setProductSearchByItem({...productSearchByItem, [idx]: ''});
                                }}
                                className="w-full text-left px-2 py-1 hover:bg-slate-700 text-xs text-slate-300 border-b border-slate-700/50 last:border-b-0"
                              >
                                {p.sku} - {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Qty"
                        step="0.01"
                        className="col-span-2 text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <div className="col-span-2 text-xs px-2 py-1 glass-sm rounded text-slate-300 bg-slate-800/50 flex items-center justify-center">
                        {item.unit_type || '-'}
                      </div>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleUpdateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        step="0.01"
                        className="col-span-2 text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    {/* B2C Specific Fields */}
                    {customerInfo?.type === 'B2C' && (
                      <div className="grid grid-cols-12 gap-1 bg-blue-900/20 p-1 rounded">
                        <div className="col-span-12 text-xs text-blue-300 font-semibold mb-1">B2C Pricing Options:</div>
                        <select
                          value={item.delivery_type}
                          onChange={(e) => handleUpdateItem(idx, 'delivery_type', e.target.value)}
                          className="col-span-3 text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          title="B2C Locco (Zak) / B2C Franco (Zak)"
                        >
                          <option value="LOCCO">Locco (Zak)</option>
                          <option value="FRANCO">Franco (Zak)</option>
                        </select>
                        <select
                          value={item.unit_type}
                          onChange={(e) => handleUpdateItem(idx, 'unit_type', e.target.value)}
                          className="col-span-3 text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="ZAK">Zak</option>
                          <option value="KG">Kg</option>
                        </select>
                        <select
                          value={item.payment_term}
                          onChange={(e) => handleUpdateItem(idx, 'payment_term', e.target.value)}
                          className="col-span-3 text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          title="B2C Cash / B2C TOP 30"
                        >
                          <option value="CASH">Cash</option>
                          <option value="TOP_30">TOP 30</option>
                        </select>
                        <div className="col-span-3 text-xs px-2 py-1 glass-sm rounded text-slate-300 bg-slate-800/50 flex items-center justify-end">
                          {formatCurrency(item.total_price || 0)}
                        </div>
                      </div>
                    )}

                    {/* B2B Specific Fields */}
                    {customerInfo?.type === 'B2B' && (
                      <div className="grid grid-cols-12 gap-1 bg-purple-900/20 p-1 rounded">
                        <div className="col-span-12 text-xs text-purple-300 font-semibold mb-1">B2B Unit Type:</div>
                        <select
                          value={item.unit_type}
                          onChange={(e) => handleUpdateItem(idx, 'unit_type', e.target.value)}
                          className="col-span-4 text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                          title="Select Zak or Kg - price will auto-calculate"
                        >
                          <option value="ZAK">Zak (per zak)</option>
                          <option value="KG">Kg (per kg)</option>
                        </select>
                        <div className="col-span-4 text-xs px-2 py-1 glass-sm rounded text-slate-300 bg-slate-800/50 flex items-center justify-center">
                          Weight: {item.weight || 30}kg
                        </div>
                        <div className="col-span-4 text-xs px-2 py-1 glass-sm rounded text-slate-300 bg-slate-800/50 flex items-center justify-end">
                          {formatCurrency(item.total_price || 0)}
                        </div>
                      </div>
                    )}

                    {/* Total Price Input */}
                    <div className="grid grid-cols-12 gap-1">
                      <input
                        type="number"
                        value={item.total_price}
                        onChange={(e) => handleUpdateItem(idx, 'total_price', parseFloat(e.target.value) || 0)}
                        placeholder="Total"
                        step="0.01"
                        className="col-span-10 text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="col-span-2 text-xs px-2 py-1 bg-red-500/30 text-red-200 hover:bg-red-500/50 rounded transition-smooth font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tax, Discount, Saving, Payment */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tax (%)</label>
              <input
                type="number"
                value={tax}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Discount (%)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Saving (Rp)</label>
              <input
                type="number"
                value={saving}
                onChange={(e) => setSaving(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                step="1000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payment</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="COD">COD</option>
                <option value="TOP">TOP</option>
                <option value="CBD">CBD</option>
              </select>
            </div>
          </div>

          {/* TOP Days */}
          {paymentType === 'TOP' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">TOP Days</label>
              <input
                type="number"
                value={topDays}
                onChange={(e) => setTopDays(parseInt(e.target.value) || 30)}
                className="w-full text-xs px-2 py-1 glass-sm rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
            <textarea
              value={globalNote}
              onChange={(e) => setGlobalNote(e.target.value)}
              placeholder="Order notes"
              className="w-full text-xs px-2 py-1 glass-sm rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows="1"
            />
          </div>

          {/* Summary */}
          <div className="pt-2 border-t border-slate-700/50">
            <div className="bg-gradient-to-r from-blue-900/40 to-slate-800/40 p-2 rounded border border-blue-700/30 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Subtotal:</span>
                <span className="text-white font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tax ({tax}%):</span>
                  <span className="text-white font-medium">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Discount ({discount}%):</span>
                  <span className="text-white font-medium">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {saving > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Saving:</span>
                  <span className="text-white font-medium">+{formatCurrency(saving)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-blue-700/50 pt-1 text-sm font-bold">
                <span className="text-slate-200">Total:</span>
                <span className="text-blue-400">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {/* AR Dialog */}
      <Dialog
        isOpen={showARDialog}
        title={`Unpaid Invoices - ${customerInfo?.name || 'Customer'}`}
        onClose={() => setShowARDialog(false)}
        onSubmit={() => setShowARDialog(false)}
        submitLabel="Close"
      >
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {unpaidInvoices.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-4">No unpaid invoices for this customer</p>
          ) : (
            <>
              <div className="bg-slate-800/50 p-2 rounded mb-2">
                <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-slate-300">
                  <div>Invoice #</div>
                  <div>Due Date</div>
                  <div className="text-right">Total</div>
                  <div className="text-right">Outstanding</div>
                </div>
              </div>
              {unpaidInvoices.map(inv => (
                <button
                  key={inv.id}
                  onClick={() => handleInvoiceClick(inv)}
                  className="w-full text-left py-2 px-1 hover:bg-slate-700/30 transition-smooth"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-slate-400">Invoice #</span>
                      <span className="text-xs text-white font-semibold">{inv.invoice_number}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-slate-400">Due Date</span>
                      <span className="text-xs text-slate-300">{formatDate(inv.due_date)}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-slate-400">Total</span>
                      <span className="text-xs text-slate-300">{formatCurrency(inv.total_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-start pt-1 border-t border-slate-700/50">
                      <span className="text-xs text-slate-400">Outstanding</span>
                      <span className={`text-xs font-semibold ${inv.total_amount - (inv.paid_amount || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency((inv.total_amount || 0) - (inv.paid_amount || 0))}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              <div className="bg-slate-800/50 p-3 rounded mt-3 border border-slate-700/50">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Total Outstanding:</span>
                  <span className="text-sm font-bold text-red-400">
                    {formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0))}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </Dialog>

      {/* Invoice Preview Modal */}
      {showInvoicePreview && previewInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Invoice Preview</h2>
              <button
                onClick={() => setShowInvoicePreview(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Preview Content */}
            <div className="bg-white text-black p-6 rounded-lg mb-4 max-h-[60vh] overflow-y-auto">
              <InvoiceTemplateRegular 
                invoice={previewInvoice}
                items={previewInvoice.items || []}
                company={companyData || {}}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
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
    </>
  );
}
