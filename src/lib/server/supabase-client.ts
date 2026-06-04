import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Get the Supabase client, lazily initialized on first call.
 * Reads SUPABASE_URL and SUPABASE_ANON_KEY from environment.
 */
export function getSupabaseClient(): SupabaseClient {
	if (_client) return _client;
	
	const url = process.env.SUPABASE_URL;
	const anonKey = process.env.SUPABASE_ANON_KEY;
	
	if (!url || !anonKey) {
		throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
	}
	
	_client = createClient(url, anonKey);
	return _client;
}
