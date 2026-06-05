import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let _anonClient: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

/**
 * Get the Supabase client for anonymous/public access.
 * Reads SUPABASE_URL and SUPABASE_ANON_KEY from environment.
 */
export function getSupabaseClient(): SupabaseClient {
	if (_anonClient) return _anonClient;
	
	const url = process.env.SUPABASE_URL;
	const anonKey = process.env.SUPABASE_ANON_KEY;
	
	if (!url || !anonKey) {
		throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
	}
	
	_anonClient = createClient(url, anonKey);
	return _anonClient;
}

/**
 * Get the Supabase client for server/service-role access.
 * Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from environment.
 * This client bypasses RLS and is intended for admin operations only.
 */
export function getSupabaseServiceClient(): SupabaseClient {
	if (_serviceClient) return _serviceClient;
	
	const url = process.env.SUPABASE_URL;
	const serviceKey = process.env.SUPABASE_SERVICE_KEY;
	
	if (!url || !serviceKey) {
		throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required for service-role access');
	}
	
	_serviceClient = createClient(url, serviceKey);
	return _serviceClient;
}
