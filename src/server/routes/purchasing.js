import express from 'express';
import { supabase } from '../db/init.js';

const router = express.Router();

// Get all purchase orders
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers(name)
      `)
      .order('order_date', { ascending: false });

    if (error) throw error;
    res.json(data.map(order => ({
      ...order,
      supplier_name: order.suppliers.name
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create purchase order
router.post('/', async (req, res) => {
  try {
    const { po_number, supplier_id, total_amount } = req.body;
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([{ po_number, supplier_id, total_amount }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
