import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
        toInsert.push({
          product_id: item.product_id,
          quantity_on_hand: 0,
          quantity_reserved: item.quantity,
          quantity_available: -item.quantity
        });
      } else {
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
}
