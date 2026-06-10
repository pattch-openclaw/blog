import { createClient } from '@supabase/supabase-js';
import { logger } from '$lib/logging';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SERVICE_CLIENT = SUPABASE_SERVICE_KEY
	? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
	: null;

/**
 * Regex matching Supabase Storage public URLs in markdown content.
 * Handles both:
 *   - Correct format:  <base>/storage/v1/object/public/<bucket>/<filename>
 *   - Broken format:   <base>/storage/v1/object/public/<bucket>/<bucket>/<filename>  (double bucket)
 */
const SUPABASE_STORAGE_URL = new RegExp(
	`${SUPABASE_URL}(/storage/v1/object/public/([^/]+)/((?:images|audio|fonts)/)?([^/]+))`,
	'g'
);

/**
 * Replace all Supabase Storage public URLs in post content with signed URLs.
 * Falls back to public URLs if the service key is unavailable or signing fails.
 *
 * @param content - Post content with potential Supabase Storage URLs
 * @param expiresInSeconds - Signed URL expiration time (default 1 hour)
 * @returns Promise resolving to the content with replaced URLs
 */
export async function replaceSupabaseUrls(content: string, expiresInSeconds = 3600): Promise<string> {
	if (!SERVICE_CLIENT) {
		logger.warn('replaceSupabaseUrls', 'SERVICE_CLIENT not initialized, returning content unchanged');
		return content;
	}

	const replacements: Array<{ match: string; signedUrl: string }> = [];
	const seen = new Set<string>();

	SUPABASE_STORAGE_URL.lastIndex = 0;
	let match;
	while ((match = SUPABASE_STORAGE_URL.exec(content)) !== null) {
		const fullUrl = match[1]; // the full URL without the protocol prefix
		const bucket = match[2];
		const _dupBucket = match[3]; // optional double-bucket segment (may be undefined)
		const filename = match[4];

		// Deduplicate: use bucket+filename as the key
		const key = `${bucket}/${filename}`;
		if (seen.has(key)) continue;
		seen.add(key);

		try {
			const { data, error } = await SERVICE_CLIENT.storage
				.from(bucket)
				.createSignedUrl(`${bucket}/${filename}`, expiresInSeconds);

			if (error) {
				logger.warn('replaceSupabaseUrls', `Failed to sign ${bucket}/${filename}: ${error.message}`);
				replacements.push({ match: fullUrl, signedUrl: fullUrl }); // keep original
			} else {
				replacements.push({ match: fullUrl, signedUrl: data.signedUrl });
			}
		} catch (e: any) {
			logger.warn('replaceSupabaseUrls', `Error signing ${bucket}/${filename}: ${e.message}`);
			replacements.push({ match: fullUrl, signedUrl: fullUrl });
		}
	}

	if (replacements.length > 0) {
		logger.info('replaceSupabaseUrls', `Replaced ${replacements.length} Supabase URL(s)`);
	} else {
		logger.info('replaceSupabaseUrls', 'No Supabase URLs found in content');
	}

	if (replacements.length === 0) return content;

	let result = content;
	for (const { match, signedUrl } of replacements) {
		result = result.replaceAll(match, signedUrl);
	}

	return result;
}
