-- Create app_versions table for storing latest app version info
CREATE TABLE IF NOT EXISTS app_versions (
  id BIGSERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  description TEXT,
  apk_url TEXT,
  windows_url TEXT,
  release_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read (for app updates)
CREATE POLICY "Allow public read app versions" 
  ON app_versions FOR SELECT 
  USING (true);

-- Policy: Allow only authenticated users to insert/update
CREATE POLICY "Allow authenticated update app versions" 
  ON app_versions FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated write app versions" 
  ON app_versions FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Insert initial version if not exists
INSERT INTO app_versions (version, description, apk_url, release_notes)
VALUES ('1.0.4', 'MMN ERP Latest', 'https://github.com/laflamics/mmn/releases/download/v1.0.4/mmn-v1.0.4.apk', 'Latest features and bug fixes')
ON CONFLICT (version) DO NOTHING;
