import { createClient } from '@supabase/supabase-js';

// Access Supabase credentials from client-safe environment variables
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

/**
 * Gets the configured URL or empty string.
 */
export const getSupabaseConfig = () => {
  return {
    url: supabaseUrl,
    configured: isSupabaseConfigured()
  };
};
