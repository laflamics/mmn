import express from 'express';
import { supabase } from '../db/init.js';

const router = express.Router();

// Get all payments
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoices(invoice_number, customers(name))
      `)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    res.json(data.map(payment => ({
      ...payment,
      invoice_number: payment.invoices.invoice_number,
      customer_name: payment.invoices.customers.name
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create payment
router.post('/', async (req, res) => {
  try {
    const { invoice_id, amount, payment_method, reference_number } = req.body;
    
    // Update invoice paid amount
    const { data: invoice } = await supabase
      .from('invoices')
      .select('paid_amount')
      .eq('id', invoice_id)
      .single();

    await supabase
      .from('invoices')
      .update({ paid_amount: (invoice.paid_amount || 0) + amount })
      .eq('id', invoice_id);

    const { data, error } = await supabase
      .from('payments')
      .insert([{ invoice_id, amount, payment_method, reference_number }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
