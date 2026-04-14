import { supabase } from './supabase';
import { memoize, cacheManager } from './cache';

// Products
const _getProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
};

export const getProducts = memoize(_getProducts, 10 * 60 * 1000); // 10 min cache

export const createProduct = async (product) => {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select();
  if (error) throw error;
  cacheManager.clearAll(); // Clear ALL cache to prevent stale data
  return data[0];
};

// Customers
const _getCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
};

export const getCustomers = memoize(_getCustomers, 10 * 60 * 1000); // 10 min cache

export const createCustomer = async (customer) => {
  const { data, error } = await supabase
    .from('customers')
    .insert([customer])
    .select();
  if (error) throw error;
  cacheManager.clearAll(); // Clear ALL cache to prevent stale data
  return data[0];
};

// Suppliers
const _getSuppliers = async () => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
};

export const getSuppliers = memoize(_getSuppliers, 10 * 60 * 1000); // 10 min cache

export const createSupplier = async (supplier) => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([supplier])
    .select();
  if (error) throw error;
  cacheManager.clearAll(); // Clear ALL cache to prevent stale data
  return data[0];
};

// Sales Orders - with pagination (simplified)
export const getSalesOrders = async (page = 1, pageSize = 50) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Get paginated sales orders with minimal joins
  const { data: orders, error, count } = await supabase
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
      customers(id, name, plafond_limit, plafond_used),
      sales_order_items(id, quantity, product_id, unit_price)
    `, { count: 'exact' })
    .order('order_date', { ascending: false })
    .range(from, to);
  
  if (error) throw error;

  // Extract unique IDs
  const productIds = [...new Set(orders.flatMap(o => o.sales_order_items?.map(i => i.product_id) || []))];
  const userIds = [...new Set(orders.map(o => o.created_by).filter(Boolean))];

  // Parallel batch fetch with minimal data
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

  // Build lookup maps
  const productsMap = {};
  productsResult.data?.forEach(p => { productsMap[p.id] = p; });

  const usersMap = {};
  usersResult.data?.forEach(u => { usersMap[u.id] = u.name; });

  const inventoryMap = {};
  inventoryResult.data?.forEach(inv => { inventoryMap[inv.product_id] = inv.quantity_available || 0; });

  // Map data efficiently
  const mappedOrders = orders.map(order => {
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
      created_by_name: usersMap[order.created_by] || order.created_by || 'Unknown',
      sales_order_items: itemsWithProducts,
      stock_status: orderHasStockIssue ? 'partial' : 'in_stock'
    };
  });

  return { data: mappedOrders, count, page, pageSize };
};

export const createSalesOrder = async (order) => {
  const { data, error } = await supabase
    .from('sales_orders')
    .insert([order])
    .select();
  if (error) throw error;
  return data[0];
};

// Invoices - with pagination
export const getInvoices = async (page = 1, pageSize = 50) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
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
      sales_orders(id, customer_id)
    `, { count: 'exact' })
    .order('invoice_date', { ascending: false })
    .range(from, to);
  
  if (error) throw error;

  // Batch fetch customer names
  const customerIds = [...new Set(data.map(inv => inv.sales_orders?.customer_id).filter(Boolean))];
  
  const customersResult = customerIds.length > 0
    ? await supabase.from('customers').select('id, name').in('id', customerIds)
    : { data: [] };

  const customersMap = {};
  customersResult.data?.forEach(c => { customersMap[c.id] = c.name; });

  const mappedInvoices = data.map(invoice => ({
    ...invoice,
    customer_name: customersMap[invoice.sales_orders?.customer_id] || 'Unknown'
  }));

  return { data: mappedInvoices, count, page, pageSize };
};

export const createInvoice = async (invoice) => {
  const { data, error } = await supabase
    .from('invoices')
    .insert([invoice])
    .select();
  if (error) throw error;
  return data[0];
};

// Reports
export const getARAgingReport = async () => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customers(name)
    `)
    .eq('status', 'unpaid')
    .order('due_date');
  if (error) throw error;

  return data.map(invoice => {
    const daysOverdue = Math.floor((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
    return {
      name: invoice.customers.name,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      total_amount: invoice.total_amount,
      paid_amount: invoice.paid_amount,
      outstanding: invoice.total_amount - invoice.paid_amount,
      days_overdue: daysOverdue
    };
  });
};

export const getAPAgingReport = async () => {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      suppliers(name)
    `)
    .eq('status', 'unpaid')
    .order('order_date');
  if (error) throw error;

  return data.map(po => ({
    name: po.suppliers.name,
    po_number: po.po_number,
    order_date: po.order_date,
    total_amount: po.total_amount,
    paid_amount: po.paid_amount || 0,
    outstanding: po.total_amount - (po.paid_amount || 0)
  }));
};


// Pricing - Get product price for customer
export const getProductPrice = async (customerId, productId) => {
  // First check if customer has custom pricing
  const { data: customPricing, error: customError } = await supabase
    .from('customer_product_pricing')
    .select('custom_price')
    .eq('customer_id', customerId)
    .eq('product_id', productId)
    .single();

  if (customPricing) {
    return customPricing.custom_price;
  }

  // Fallback to product default price
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('unit_price')
    .eq('id', productId)
    .single();

  if (productError) throw productError;
  return product.unit_price;
};

// Pricing - Save or update customer product pricing
export const saveCustomerProductPrice = async (customerId, productId, customPrice, overwrite = false) => {
  if (overwrite) {
    // Upsert - update if exists, insert if not
    const { data, error } = await supabase
      .from('customer_product_pricing')
      .upsert({
        customer_id: customerId,
        product_id: productId,
        custom_price: customPrice,
        updated_at: new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).toISOString()
      }, {
        onConflict: 'customer_id,product_id'
      })
      .select();
    if (error) throw error;
    return data[0];
  } else {
    // Only insert if not exists
    const { data: existing } = await supabase
      .from('customer_product_pricing')
      .select('id')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .single();

    if (existing) {
      return existing; // Already exists, don't overwrite
    }

    const { data, error } = await supabase
      .from('customer_product_pricing')
      .insert([{
        customer_id: customerId,
        product_id: productId,
        custom_price: customPrice
      }])
      .select();
    if (error) throw error;
    return data[0];
  }
};

// Plafond - Check customer plafond status
export const checkPlafondStatus = async (customerId) => {
  const { data: customer, error } = await supabase
    .from('customers')
    .select('plafond_limit, plafond_used')
    .eq('id', customerId)
    .single();

  if (error) throw error;

  const limit = customer.plafond_limit || 0;
  const used = customer.plafond_used || 0;
  const remaining = limit - used;
  const usagePercent = limit > 0 ? (used / limit) * 100 : 0;
  const isWarning = usagePercent >= 95;
  const isBlocked = usagePercent >= 100;

  return {
    limit,
    used,
    remaining,
    usagePercent: Math.round(usagePercent * 100) / 100,
    isWarning,
    isBlocked,
    warningMessage: isBlocked 
      ? 'Plafond limit reached - cannot create SO'
      : isWarning 
      ? `Warning: ${Math.round(usagePercent)}% of plafond used`
      : null
  };
};

// Plafond - Update plafond_used when SO is created
export const updatePlafondUsed = async (customerId, soAmount) => {
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('plafond_used')
    .eq('id', customerId)
    .single();

  if (fetchError) throw fetchError;

  const newPlafondUsed = (customer.plafond_used || 0) + soAmount;

  const { data, error } = await supabase
    .from('customers')
    .update({ plafond_used: newPlafondUsed })
    .eq('id', customerId)
    .select();

  if (error) throw error;
  return data[0];
};

// Plafond - Reduce plafond_used when invoice is paid
export const reducePlafondUsed = async (customerId, invoiceAmount) => {
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('plafond_used')
    .eq('id', customerId)
    .single();

  if (fetchError) throw fetchError;

  const newPlafondUsed = Math.max(0, (customer.plafond_used || 0) - invoiceAmount);

  const { data, error } = await supabase
    .from('customers')
    .update({ plafond_used: newPlafondUsed })
    .eq('id', customerId)
    .select();

  if (error) throw error;
  return data[0];
};

// B2C/B2B Pricing - Get applicable price untuk customer + product
export const getApplicablePrice = async (customerId, productId) => {
  try {
    // Fetch customer info
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('customer_type, pricing_tier')
      .eq('id', customerId)
      .single();

    if (custError) throw custError;

    // Fetch product info
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('b2c_locco_price_zak, b2c_franco_price_zak, b2c_cash, b2c_top_30, b2b_default_price, weight')
      .eq('id', productId)
      .single();

    if (prodError) throw prodError;

    // B2C pricing - return all variants
    if (customer.customer_type === 'B2C') {
      return {
        type: 'B2C',
        variants: {
          locco_zak: product.b2c_locco_price_zak,
          franco_zak: product.b2c_franco_price_zak,
          cash: product.b2c_cash,
          top_30: product.b2c_top_30
        },
        weight: product.weight || 30
      };
    }

    // B2B pricing - check custom price first
    const { data: customPrice } = await supabase
      .from('customer_product_pricing')
      .select('custom_price')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .single();

    if (customPrice) {
      return {
        type: 'B2B_CUSTOM',
        price: customPrice.custom_price,
        tier: customer.pricing_tier
      };
    }

    // Fallback to B2B default price
    return {
      type: 'B2B_DEFAULT',
      price: product.b2b_default_price,
      tier: customer.pricing_tier
    };
  } catch (error) {
    console.error('Error getting applicable price:', error);
    throw error;
  }
};

// B2C/B2B Pricing - Calculate unit price based on delivery type and unit type
export const calculateUnitPrice = (basePrice, unitType, weight = 30) => {
  if (unitType === 'ZAK') {
    return basePrice;
  } else if (unitType === 'KG') {
    return basePrice / weight;
  }
  return basePrice;
};

// B2C/B2B Pricing - Calculate total from quantity and unit price
export const calculateTotal = (quantity, unitPrice) => {
  return quantity * unitPrice;
};

// B2C/B2B Pricing - Calculate unit price from total and quantity
export const calculateUnitPriceFromTotal = (total, quantity) => {
  if (quantity === 0) return 0;
  return total / quantity;
};

// Delivery Notes - with pagination
export const getDeliveryNotes = async (page = 1, pageSize = 50) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('delivery_notes')
    .select(`
      id,
      dn_number,
      delivery_date,
      driver_name,
      vehicle_number,
      status,
      sales_order_id,
      sales_orders(id, order_number, customer_id),
      delivery_note_items(id, quantity, product_id)
    `, { count: 'exact' })
    .order('delivery_date', { ascending: false })
    .range(from, to);
  
  if (error) throw error;

  // Batch fetch customers and products
  const customerIds = [...new Set(data.map(dn => dn.sales_orders?.customer_id).filter(Boolean))];
  const productIds = [...new Set(data.flatMap(dn => dn.delivery_note_items?.map(i => i.product_id) || []))];

  const [customersResult, productsResult] = await Promise.all([
    customerIds.length > 0
      ? supabase.from('customers').select('id, name').in('id', customerIds)
      : Promise.resolve({ data: [] }),
    productIds.length > 0
      ? supabase.from('products').select('id, name, uom').in('id', productIds)
      : Promise.resolve({ data: [] })
  ]);

  const customersMap = {};
  customersResult.data?.forEach(c => { customersMap[c.id] = c.name; });

  const productsMap = {};
  productsResult.data?.forEach(p => { productsMap[p.id] = p; });

  const mappedDNs = data.map(dn => {
    const itemsWithProducts = (dn.delivery_note_items || []).map(item => ({
      ...item,
      product_name: productsMap[item.product_id]?.name || 'Unknown',
      uom: productsMap[item.product_id]?.uom || ''
    }));

    return {
      ...dn,
      order_number: dn.sales_orders?.order_number || 'Unknown',
      customer_name: customersMap[dn.sales_orders?.customer_id] || 'Unknown',
      delivery_note_items: itemsWithProducts
    };
  });

  return { data: mappedDNs, count, page, pageSize };
};

export const createDeliveryNote = async (dn) => {
  const { data, error } = await supabase
    .from('delivery_notes')
    .insert([dn])
    .select();
  if (error) throw error;
  return data[0];
};


