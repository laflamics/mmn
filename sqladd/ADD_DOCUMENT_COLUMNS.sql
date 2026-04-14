-- Add document columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS document_name TEXT;

-- Add document columns to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS document_name TEXT;

-- Create storage bucket for documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set RLS policies for documents bucket
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can read documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND auth.role() = 'authenticated'
  );
