import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  
  login: (user) => {
    // Only store minimal user data, not the token
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  
  logout: async () => {
    localStorage.removeItem('user');
    await supabase.auth.signOut();
    set({ user: null });
  },
  
  setUser: (user) => set({ user }),
  
  initializeAuth: async () => {
    try {
      // Check if there's a valid Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Session exists, fetch user profile
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userProfile) {
          const user = {
            id: userProfile.id,
            email: userProfile.email,
            name: userProfile.name,
            role_id: userProfile.role_id,
            department: userProfile.department,
            is_active: userProfile.is_active,
          };
          localStorage.setItem('user', JSON.stringify(user));
          set({ user, loading: false });
          return;
        }
      }

      // Fallback to localStorage if no Supabase session
      const user = localStorage.getItem('user');
      if (user) {
        set({ user: JSON.parse(user), loading: false });
        return;
      }

      set({ user: null, loading: false });
    } catch (err) {
      console.error('Auth initialization error:', err);
      set({ user: null, loading: false });
    }
  },
}));
