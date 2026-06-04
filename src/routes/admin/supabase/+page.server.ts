import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		supabaseUrl: process.env.SUPABASE_URL || '(empty)',
		supabaseAnonKey:
			process.env.SUPABASE_ANON_KEY
				? `${process.env.SUPABASE_ANON_KEY.slice(0, 8)}…${process.env.SUPABASE_ANON_KEY.slice(-8)}`
				: '(not set)'
	};
};
