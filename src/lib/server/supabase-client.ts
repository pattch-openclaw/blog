import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let _supabaseClient: SupabaseClient | null = null;

/**
 * Get the Supabase client for all operations.
 * Uses the anon/publishable key. RLS policies control access.
 * This is the recommended approach for server-side access too —
 * the security boundary is the key itself, not a separate service role.
 */
export function getSupabaseClient(): SupabaseClient {
	if (_supabaseClient) return _supabaseClient;
	
	const url = process.env.SUPABASE_URL;
	const anonKey = process.env.SUPABASE_ANON_KEY;
	
	if (!url || !anonKey) {
		throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
	}
	
	_supabaseClient = createClient(url, anonKey);
	return _supabaseClient;
}
