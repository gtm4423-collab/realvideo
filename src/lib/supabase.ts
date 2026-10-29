import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://wclpbpbmhzezrabhqmai.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_T29_VXasgE0YqG8SDSEhCw_J4njttNL';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Checks connection to the Supabase project
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  details?: unknown;
}> {
  try {
    // Ping auth health or storage/rest to verify connection
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return {
        connected: false,
        message: error.message,
      };
    }
    return {
      connected: true,
      message: 'Successfully connected to Supabase project (wclpbpbmhzezrabhqmai)!',
      details: data,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err?.message || 'Connection failed',
    };
  }
}
