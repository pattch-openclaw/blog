import type { PageServerLoad } from './$types';
import { readFileSync } from 'fs';

const SECRETS_PATH = '/Users/samuelsampson/Coding/openclaw-blog/.blog-secrets';

function readSecretsDebug() {
	try {
		const raw = readFileSync(SECRETS_PATH, 'utf-8');
		const lines = raw.split('\n');
		const pairs: { key: string; value: string; raw: string }[] = [];
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const eq = trimmed.indexOf('=');
			if (eq !== -1) {
				pairs.push({
					key: trimmed.slice(0, eq).trim(),
					value: trimmed.slice(eq + 1).trim(),
					raw: trimmed
				});
			}
		}
		return { found: true, lines, pairs, fileSize: raw.length };
	} catch (err: any) {
		return { found: false, error: err.message };
	}
}

export const load: PageServerLoad = () => {
	const debug = readSecretsDebug();
	return {
		supabaseUrl: process.env.SUPABASE_URL || '(empty)',
		supabaseAnonKey:
			process.env.SUPABASE_ANON_KEY
				? `${process.env.SUPABASE_ANON_KEY.slice(0, 8)}…${process.env.SUPABASE_ANON_KEY.slice(-8)}`
				: '(not set)',
		supabaseUrlTest: process.env.SUPABASE_URL_TEST || '(not set)',
		secretsDebug: debug
	};
};
