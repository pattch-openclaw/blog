import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		envPairs: {
			SUPABASE_URL: process.env.SUPABASE_URL ?? '(not set)',
			SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '(not set)',
			SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ?? '(not set)',
			SUPABASE_URL_TEST: process.env.SUPABASE_URL_TEST ?? '(not set)'
		}
	};
};
