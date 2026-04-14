import express from 'express';
import { supabase } from '../db/init.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, department } = req.body;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
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
          role,
          department,
        },
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ user: data[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      token: data.session.access_token,
      user: profile,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/create-user', async (req, res) => {
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
});

router.post('/update-user-password', async (req, res) => {
  try {
    const { userId, password } = req.body;

    console.log('Updating password for user:', userId);

    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password required' });
    }

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) {
      console.error('Password update error:', error);
      return res.status(400).json({ error: error.message, details: error });
    }

    console.log('Password updated successfully for user:', userId);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update exception:', error);
    res.status(400).json({ error: error.message });
  }
});

router.post('/update-user', async (req, res) => {
  try {
    const { userId, name, email, role_id, department, is_active } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    console.log('Updating user:', { userId, name, email, role_id, department, is_active });

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
      console.error('Update user error:', error);
      return res.status(400).json({ error: error.message, details: error });
    }

    console.log('User updated successfully:', data);
    res.json({ user: data[0] });
  } catch (error) {
    console.error('Update user exception:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
