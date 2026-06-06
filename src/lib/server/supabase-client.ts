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
	
	let url = process.env.SUPABASE_URL;
	const anonKey = process.env.SUPABASE_ANON_KEY;
	
	if (!url || !anonKey) {
		throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
	}
	
	// Strip trailing /rest/v1 or /rest/v1/ if accidentally included in the config.
	// createClient() already appends /rest/v1 internally.
	url = url.replace(/\/rest\/v1\/?$/, '');
	
	_supabaseClient = createClient(url, anonKey);
	return _supabaseClient;
}
