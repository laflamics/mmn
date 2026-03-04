import { supabase } from './supabase';

// Products
export const getProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
};

export const createProduct = async (product) => {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select();
  if (error) throw error;
  return data[0];
};

// Customers
export const getCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
};

export const createCustomer = async (customer) => {
  const { data, error } = await supabase
    .from('customers')
    .insert([customer])
    .select();
  if (error) throw error;
  return data[0];
};

// Suppliers
export const getSuppliers = async () => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
};

export const createSupplier = async (supplier) => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([supplier])
    .select();
  if (error) throw error;
  return data[0];
};

// Sales Orders
export const getSalesOrders = async () => {
  const { data, error } = await supabase
    .from('sales_orders')
    .select(`
      *,
      customers(name)
    `)
    .order('order_date', { ascending: false });
  if (error) throw error;
  return data.map(order => ({
    ...order,
    customer_name: order.customers.name
  }));
};

export const createSalesOrder = async (order) => {
  const { data, error } = await supabase
    .from('sales_orders')
    .insert([order])
    .select();
  if (error) throw error;
  return data[0];
};

// Invoices
export const getInvoices = async () => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customers(name)
    `)
    .order('invoice_date', { ascending: false });
  if (error) throw error;
  return data.map(invoice => ({
    ...invoice,
    customer_name: invoice.customers.name
  }));
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
        updated_at: new Date().toISOString()
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
