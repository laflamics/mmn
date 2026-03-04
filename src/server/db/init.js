import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function initializeDatabase() {
  try {
    // Tables are created via Supabase dashboard or migrations
    // This function verifies connection
    const { data, error } = await supabase.from('products').select('count', { count: 'exact' });
    
    if (error) {
      console.error('Database connection error:', error);
    } else {
      console.log('Database connected successfully');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}
