-- Add DELETE policy for sales_orders
CREATE POLICY "Authenticated users can delete sales orders" ON sales_orders
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add DELETE policy for sales_order_items
CREATE POLICY "Authenticated users can delete sales order items" ON sales_order_items
  FOR DELETE USING (auth.role() = 'authenticated');
