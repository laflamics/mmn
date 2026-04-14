-- Add delivery proof columns to delivery_notes table
ALTER TABLE delivery_notes
ADD COLUMN IF NOT EXISTS sj_signed_url TEXT,
ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for delivery proofs if it doesn't exist
-- Note: This needs to be done via Supabase dashboard or API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('delivery_proofs', 'delivery_proofs', true);
