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
    const { userId, name, email, role_id, department, is_active } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        name,
        email,
        role_id: parseInt(role_id),
        department,
        is_active
      })
      .eq('id', userId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ user: data[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
