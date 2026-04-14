import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // Handle remind-purchasing request
    if (body.items && Array.isArray(body.items)) {
      const items = body.items

      if (items.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No items to remind' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const validItems = items.filter(
        (item: any) => item.product_id && item.quantity !== undefined && item.available_stock !== undefined
      )

      if (validItems.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid items format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const reminders = validItems.map((item: any) => {
        const shortage = Math.max(0, item.quantity - (item.available_stock || 0))
        return {
          product_id: item.product_id,
          shortage_qty: parseFloat(shortage.toFixed(2)),
          uom: item.uom || 'pcs',
          status: 'pending',
          supplier_id: null,
        }
      })

      const { data, error } = await supabase
        .from('purchasing_reminders')
        .insert(reminders)
        .select()

      if (error) throw error

      return new Response(
        JSON.stringify({
          message: 'Reminder sent to purchasing team',
          count: data?.length || reminders.length,
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle process-order request
    if (body.orderId) {
      const orderId = body.orderId

      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Order ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get order items
      const { data: orderItems, error: itemsErr } = await supabase
        .from('sales_order_items')
        .select('product_id, quantity')
        .eq('sales_order_id', orderId)

      if (itemsErr) throw itemsErr

      const productIds = orderItems.map((item: any) => item.product_id)

      // Fetch existing inventory
      const { data: existingInventories, error: fetchErr } = await supabase
        .from('inventory')
        .select('*')
        .in('product_id', productIds)

      if (fetchErr) throw fetchErr

      const inventoryMap: any = {}
      existingInventories?.forEach((inv: any) => {
        inventoryMap[inv.product_id] = inv
      })

      // Prepare updates and inserts
      const toInsert: any[] = []
      const toUpdate: any[] = []

      for (const item of orderItems) {
        const existing = inventoryMap[item.product_id]

        if (!existing) {
          toInsert.push({
            product_id: item.product_id,
            quantity_on_hand: 0,
            quantity_reserved: item.quantity,
            quantity_available: -item.quantity,
          })
        } else {
          const newReserved = (existing.quantity_reserved || 0) + item.quantity
          const newAvailable = (existing.quantity_on_hand || 0) - newReserved

          toUpdate.push({
            id: existing.id,
            quantity_reserved: newReserved,
            quantity_available: newAvailable,
          })
        }
      }

      // Insert new inventory records
      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('inventory')
          .insert(toInsert)

        if (insertErr) throw insertErr
      }

      // Update existing inventory records
      for (const item of toUpdate) {
        const { error: updateErr } = await supabase
          .from('inventory')
          .update({
            quantity_reserved: item.quantity_reserved,
            quantity_available: item.quantity_available,
          })
          .eq('id', item.id)

        if (updateErr) throw updateErr
      }

      // Update order status
      const { error: statusErr } = await supabase
        .from('sales_orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId)

      if (statusErr) throw statusErr

      return new Response(
        JSON.stringify({ message: 'Order processed successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request - provide either items or orderId' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
