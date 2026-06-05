import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const url = process.env.SUPABASE_URL ?? '(not set)';
	const anonKey = process.env.SUPABASE_ANON_KEY ? `${process.env.SUPABASE_ANON_KEY.slice(0, 8)}…${process.env.SUPABASE_ANON_KEY.slice(-8)}` : '(not set)';

	return {
		url,
		anonKey,
		error: !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY
			? 'Supabase credentials not configured.'
			: null,
	};
};
