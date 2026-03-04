import express from 'express';
import { supabase } from '../db/init.js';

const router = express.Router();

// Get inventory
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        products(sku, name, category)
      `)
      .order('products(name)');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update inventory
router.patch('/:id', async (req, res) => {
  try {
    const { quantity_on_hand, quantity_reserved } = req.body;
    const quantity_available = quantity_on_hand - quantity_reserved;
    
    const { data, error } = await supabase
      .from('inventory')
      .update({ quantity_on_hand, quantity_reserved, quantity_available, last_updated: new Date() })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
