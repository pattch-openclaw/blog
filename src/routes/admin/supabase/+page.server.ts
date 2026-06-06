import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const anonKeyRaw = process.env.SUPABASE_ANON_KEY ?? '(not set)';
	const anonKeyPreview = anonKeyRaw !== '(not set)' && anonKeyRaw.length > 16
		? `${anonKeyRaw.slice(0, 8)}…${anonKeyRaw.slice(-8)}`
		: anonKeyRaw;

	// Extract the role claim from the JWT to help diagnose auth issues
	let jwtRole: string | null = null;
	try {
		if (anonKeyRaw !== '(not set)') {
			const parts = anonKeyRaw.split('.');
			if (parts.length === 3) {
				const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
				jwtRole = payload.role ?? payload['https://supabase.com/roles'] ?? null;
			}
		}
	} catch {}

	return {
		envPairs: {
			SUPABASE_URL: process.env.SUPABASE_URL ?? '(not set)',
			SUPABASE_ANON_KEY: anonKeyPreview,
			SUPABASE_ANON_KEY_FULL: anonKeyRaw,
			SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ?? '(not set)',
			SUPABASE_URL_TEST: process.env.SUPABASE_URL_TEST ?? '(not set)'
		},
		jwtRole
	};
};
