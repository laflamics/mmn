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

// Process order - reserve inventory
router.post('/process-order', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID required' });
    }

    // Get order items
    const { data: orderItems, error: itemsErr } = await supabase
      .from('sales_order_items')
      .select('product_id, quantity')
      .eq('sales_order_id', orderId);

    if (itemsErr) throw itemsErr;

    // Get all product IDs from order items
    const productIds = orderItems.map(item => item.product_id);

    // Fetch all existing inventory records in one query
    const { data: existingInventories, error: fetchErr } = await supabase
      .from('inventory')
      .select('*')
      .in('product_id', productIds);

    if (fetchErr) throw fetchErr;

    // Create a map for quick lookup
    const inventoryMap = {};
    existingInventories?.forEach(inv => {
      inventoryMap[inv.product_id] = inv;
    });

    // Prepare updates and inserts
    const toInsert = [];
    const toUpdate = [];

    orderItems.forEach(item => {
      const existing = inventoryMap[item.product_id];

      if (!existing) {
        // Create new inventory record
        toInsert.push({
          product_id: item.product_id,
          quantity_on_hand: 0,
          quantity_reserved: item.quantity,
          quantity_available: -item.quantity
        });
      } else {
        // Update existing inventory
        const newReserved = (existing.quantity_reserved || 0) + item.quantity;
        const newAvailable = (existing.quantity_on_hand || 0) - newReserved;

        toUpdate.push({
          id: existing.id,
          quantity_reserved: newReserved,
          quantity_available: newAvailable
        });
      }
    });

    // Batch insert and update in parallel
    const operations = [];

    if (toInsert.length > 0) {
      operations.push(
        supabase.from('inventory').insert(toInsert)
      );
    }

    if (toUpdate.length > 0) {
      // Update each record
      operations.push(
        ...toUpdate.map(item =>
          supabase.from('inventory')
            .update({
              quantity_reserved: item.quantity_reserved,
              quantity_available: item.quantity_available
            })
            .eq('id', item.id)
        )
      );
    }

    // Execute all operations in parallel
    if (operations.length > 0) {
      const results = await Promise.all(operations);
      
      // Check for errors
      for (const result of results) {
        if (result.error) throw result.error;
      }
    }

    // Update order status to processed
    const { error: statusErr } = await supabase
      .from('sales_orders')
      .update({ status: 'confirmed' })
      .eq('id', orderId);

    if (statusErr) throw statusErr;

    res.json({ message: 'Order processed successfully' });
  } catch (error) {
    console.error('Process order error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Remind purchasing team about stock shortage
router.post('/remind-purchasing', async (req, res) => {
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
        supplier_id: null // Will be selected by user when creating PO
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
});

export default router;
