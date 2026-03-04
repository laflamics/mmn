import express from 'express';
import { supabase } from '../db/init.js';

const router = express.Router();

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get supplier with plafond info
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    
    const plafond_remaining = data.plafond_limit - data.plafond_used;
    res.json({ ...data, plafond_remaining });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create supplier
router.post('/', async (req, res) => {
  try {
    const { name, contact_person, email, phone, address, city, plafond_limit } = req.body;
    const { data, error } = await supabase
      .from('suppliers')
      .insert([{ name, contact_person, email, phone, address, city, plafond_limit }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update supplier plafond
router.patch('/:id/plafond', async (req, res) => {
  try {
    const { plafond_limit } = req.body;
    const { data, error } = await supabase
      .from('suppliers')
      .update({ plafond_limit })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
