import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items to remind' });
    }

    // Validate items structure
    const validItems = items.filter(item => item.product_id && item.quantity !== undefined && item.available_stock !== undefined);
    
    if (validItems.length === 0) {
      return res.status(400).json({ error: 'Invalid items format' });
    }

    // Create reminder for each item with shortage
    const reminders = validItems.map(item => {
      const shortage = Math.max(0, item.quantity - (item.available_stock || 0));
      return {
        product_id: item.product_id,
        shortage_qty: parseFloat(shortage.toFixed(2)),
        uom: item.uom || 'pcs',
        status: 'pending',
        supplier_id: null
      };
    });

    if (reminders.length === 0) {
      return res.status(400).json({ error: 'No items with shortage' });
    }

    const { data, error: insertErr } = await supabase
      .from('purchasing_reminders')
      .insert(reminders)
      .select();

    if (insertErr) {
      console.error('Insert error:', insertErr);
      throw insertErr;
    }

    res.status(201).json({ 
      message: 'Reminder sent to purchasing team',
      count: data?.length || reminders.length
    });
  } catch (error) {
    console.error('Remind purchasing error:', error);
    res.status(500).json({ error: error.message || 'Failed to create reminders' });
  }
}
