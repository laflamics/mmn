import express from 'express';
import { supabase } from '../db/init.js';

const router = express.Router();

// AR Aging Report
router.get('/ar-aging', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers(name)
      `)
      .eq('status', 'unpaid')
      .order('due_date');

    if (error) throw error;

    const arAging = data.map(invoice => {
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

    res.json(arAging);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AP Aging Report
router.get('/ap-aging', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers(name)
      `)
      .eq('status', 'unpaid')
      .order('order_date');

    if (error) throw error;

    const apAging = data.map(po => ({
      name: po.suppliers.name,
      po_number: po.po_number,
      order_date: po.order_date,
      total_amount: po.total_amount,
      paid_amount: po.paid_amount || 0,
      outstanding: po.total_amount - (po.paid_amount || 0)
    }));

    res.json(apAging);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inventory Report
router.get('/inventory', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        products(sku, name, unit_price)
      `)
      .order('products(name)');

    if (error) throw error;

    const inventoryReport = data.map(item => ({
      sku: item.products.sku,
      name: item.products.name,
      quantity_on_hand: item.quantity_on_hand,
      quantity_reserved: item.quantity_reserved,
      quantity_available: item.quantity_available,
      inventory_value: item.products.unit_price * item.quantity_on_hand
    }));

    res.json(inventoryReport);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
