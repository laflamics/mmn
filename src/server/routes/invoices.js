import express from 'express';
import { supabase } from '../db/init.js';

const router = express.Router();

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers(name)
      `)
      .order('invoice_date', { ascending: false });

    if (error) throw error;
    res.json(data.map(invoice => ({
      ...invoice,
      customer_name: invoice.customers.name
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice
router.post('/', async (req, res) => {
  try {
    const { invoice_number, customer_id, sales_order_id, total_amount, due_date } = req.body;
    const { data, error } = await supabase
      .from('invoices')
      .insert([{ invoice_number, customer_id, sales_order_id, total_amount, due_date }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
