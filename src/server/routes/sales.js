import express from 'express';
import { supabase } from '../db/init.js';

const router = express.Router();

// Get all sales orders
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customers(name)
      `)
      .order('order_date', { ascending: false });

    if (error) throw error;
    res.json(data.map(order => ({
      ...order,
      customer_name: order.customers.name
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create sales order
router.post('/', async (req, res) => {
  try {
    const { order_number, customer_id, total_amount } = req.body;
    const { data, error } = await supabase
      .from('sales_orders')
      .insert([{ order_number, customer_id, total_amount }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update sales order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('sales_orders')
      .update({ status })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
