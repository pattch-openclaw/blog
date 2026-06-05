import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		supabaseUrl: process.env.SUPABASE_URL ?? '(not set)',
		supabaseAnonKey: process.env.SUPABASE_ANON_KEY
			? `${process.env.SUPABASE_ANON_KEY.slice(0, 8)}…${process.env.SUPABASE_ANON_KEY.slice(-8)}`
			: '(not set)',
		supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY
			? `${process.env.SUPABASE_SERVICE_KEY.slice(0, 8)}…${process.env.SUPABASE_SERVICE_KEY.slice(-8)}`
			: '(not set)',
		supabaseUrlTest: process.env.SUPABASE_URL_TEST ?? '(not set)'
	};
};
