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
    const { email, name, role_id, department, is_active } = req.body;

    // Create auth user without password
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create user profile
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          name,
          role_id: parseInt(role_id),
          department,
          is_active,
        },
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ 
      user: data[0],
      message: 'User created. Set password in edit user.'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
