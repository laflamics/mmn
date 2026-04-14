import express from 'express';
import { supabase } from '../db/init.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const { sku, name, description, category, unit_price, cost_price } = req.body;
    const { data, error } = await supabase
      .from('products')
      .insert([{ sku, name, description, category, unit_price, cost_price }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      unit_price,
      cost_price,
      b2c_locco_price_zak,
      b2c_franco_price_zak,
      b2c_cash,
      b2c_top_30,
      b2b_default_price
    } = req.body;

    const { data, error } = await supabase
      .from('products')
      .update({
        name,
        description,
        category,
        unit_price,
        cost_price,
        b2c_locco_price_zak,
        b2c_franco_price_zak,
        b2c_cash,
        b2c_top_30,
        b2b_default_price
      })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
