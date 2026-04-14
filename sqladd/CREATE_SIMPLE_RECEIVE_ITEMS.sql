-- Simple table untuk track received items per PO item
CREATE TABLE IF NOT EXISTS po_receive_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_item_id BIGINT NOT NULL REFERENCES purchase_order_items(id) ON DELETE CASCADE,
  quantity_received INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_po_receive_items_po_item_id ON po_receive_items(purchase_order_item_id);

-- Disable RLS
ALTER TABLE po_receive_items DISABLE ROW LEVEL SECURITY;
GRANT ALL ON po_receive_items TO authenticated;
