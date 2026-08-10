import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseServiceKey) {
  console.warn('⚠️ [SupabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not defined. Admin operations may be restricted.');
}

/**
 * Privileged Supabase Client for Server-Side Route Handlers
 * Uses SERVICE_ROLE_KEY to perform admin identity provisioning, user auth creation, and audit logging.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
