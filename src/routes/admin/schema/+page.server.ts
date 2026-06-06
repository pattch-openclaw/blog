import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';

export const load: PageServerLoad = async () => {
	const url = process.env.SUPABASE_URL ?? '(not set)';
	const anonKey = process.env.SUPABASE_ANON_KEY ?? '(not set)';
	const anonKeyPreview = anonKey !== '(not set)' && anonKey.length > 16
		? `${anonKey.slice(0, 8)}…${anonKey.slice(-8)}`
		: anonKey;

	// Decode JWT role from the anon key for quick diagnosis
	let jwtRole: string | null = null;
	try {
		if (anonKey !== '(not set)') {
			const parts = anonKey.split('.');
			if (parts.length === 3) {
				const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
				jwtRole = payload.role ?? payload['https://supabase.com/roles'] ?? null;
			}
		}
	} catch {}

	// If we have valid credentials, run diagnostic queries via the anon key
	let diagError: string | null = null;
	let dbPostsCount: number | null = null;
	let dbPostsRows: Record<string, unknown>[] = [];
	let dbMediaCount: number | null = null;

	if (url !== '(not set)' && anonKey !== '(not set)') {
		// Strip trailing /rest/v1 if accidentally included
		const cleanUrl = url.replace(/\/rest\/v1\/?$/, '');
		const client = createClient(cleanUrl, anonKey);

		try {
			// Check row count visible to anon role
			const { count: mediaCount } = await client
				.from('media_entries')
				.select('*', { count: 'exact', head: true });
			dbMediaCount = mediaCount ?? 0;
		} catch (e: any) {
			diagError = (e as Error).message;
		}

		if (!diagError) {
			const { count: postsCount, data: postsData } = await client
				.from('posts')
				.select('*', { count: 'exact' });
			dbPostsCount = postsCount ?? 0;
			dbPostsRows = (postsData as Record<string, unknown>[]) || [];
		}
	}

	return {
		url,
		anonKey: anonKeyPreview,
		anonKeyFull: anonKey,
		jwtRole,
		diagError,
		dbPostsCount,
		dbPostsRows,
		dbMediaCount,
		error: !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY
			? 'Supabase credentials not configured.'
			: null,
	};
};
