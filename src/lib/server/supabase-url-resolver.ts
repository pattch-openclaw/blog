import { createClient } from '@supabase/supabase-js';
import { logger } from '$lib/logging';

/**
 * Utility class for resolving Supabase Storage URLs to signed URLs.
 * Uses URL parsing for robust detection instead of regex.
 */
export class SupabaseUrlResolver {
	private readonly url: string | null;
	private readonly serviceKey: string | null;
	private readonly serviceClient: any | null;

	constructor() {
		this.url = process.env.SUPABASE_URL ?? null;
		this.serviceKey = process.env.SUPABASE_SERVICE_KEY ?? null;
		this.serviceClient = this.serviceKey && this.url ? createClient(this.url, this.serviceKey) : null;
	}

	/**
	 * Check if this resolver is configured and functional.
	 */
	isConfigured(): boolean {
		return this.url !== null && this.serviceKey !== null && this.serviceClient !== null;
	}

	/**
	 * Check if a URL is a Supabase Storage public URL.
	 * @param url - Full URL to check
	 * @returns True if the URL is a Supabase Storage public URL
	 */
	isSupabaseStorageUrl(url: string): boolean {
		if (!this.url) return false;

		try {
			const parsed = new URL(url);
			return (
				parsed.origin === this.url &&
				parsed.pathname.startsWith('/storage/v1/object/public/')
			);
		} catch {
			return false;
		}
	}

	/**
	 * Extract bucket and filename from a Supabase Storage URL.
	 * @param url - Full Supabase Storage URL
	 * @returns Object with bucket and filename, or null if not a valid URL
	 */
	parseStorageUrl(url: string): { bucket: string; filename: string } | null {
		if (!this.isSupabaseStorageUrl(url)) return null;

		try {
			const parsed = new URL(url);
			// Path format: /storage/v1/object/public/<bucket>/<filename>
			const parts = parsed.pathname.split('/').filter(Boolean);
			// parts will be: ['storage', 'v1', 'object', 'public', bucket, filename]
			if (parts.length >= 6 && parts[0] === 'storage' && parts[1] === 'v1') {
				const bucket = parts[4];
				const filename = parts[5];
				if (['images', 'audio', 'fonts'].includes(bucket)) {
					return { bucket, filename };
				}
			}
		} catch {
			// Invalid URL
		}
		return null;
	}

	/**
	 * Generate a signed URL for a storage path.
	 * @param bucket - Storage bucket name
	 * @param filename - File path within bucket
	 * @param expiresInSeconds - URL expiration time
	 * @returns Signed URL or original public URL if signing fails
	 */
	async getSignedUrl(bucket: string, filename: string, expiresInSeconds = 3600): Promise<string> {
		if (!this.serviceClient) {
			logger.warn('SupabaseUrlResolver.getSignedUrl', 'Service client not initialized, returning public URL');
			return `${this.url}/storage/v1/object/public/${bucket}/${filename}`;
		}

		const fullPath = `${bucket}/${filename}`;
		try {
			const { data, error } = await this.serviceClient.storage
				.from(bucket)
				.createSignedUrl(fullPath, expiresInSeconds);

			if (error) {
				logger.warn(
					'SupabaseUrlResolver.getSignedUrl',
					`Failed to sign URL for ${fullPath}: ${error.message}`
				);
				return `${this.url}/storage/v1/object/public/${bucket}/${filename}`;
			}

			logger.debug('SupabaseUrlResolver.getSignedUrl', `Generated signed URL for ${fullPath}`);
			return data.signedUrl;
		} catch (e: any) {
			logger.warn(
				'SupabaseUrlResolver.getSignedUrl',
				`Error signing URL for ${fullPath}: ${e.message}`
			);
			return `${this.url}/storage/v1/object/public/${bucket}/${filename}`;
		}
	}

	/**
	 * Replace all Supabase Storage public URLs in content with signed URLs.
	 * @param content - Content containing Supabase Storage URLs
	 * @param expiresInSeconds - Signed URL expiration time
	 * @returns Content with URLs replaced
	 */
	async replaceUrls(content: string, expiresInSeconds = 3600): Promise<string> {
		if (!this.isConfigured()) {
			logger.warn('SupabaseUrlResolver.replaceUrls', 'Resolver not configured, returning content unchanged');
			return content;
		}

		const replacements: Array<{ match: string; signedUrl: string; bucket: string; filename: string }> = [];
		const seen = new Set<string>();

		// Find all URLs in the content
		// Use a simple URL regex pattern
		const urlRegex = /https?:\/\/[^\s"')>]+/g;
		let match;

		while ((match = urlRegex.exec(content)) !== null) {
			const url = match[0];
			const parsed = this.parseStorageUrl(url);

			if (parsed) {
				const { bucket, filename } = parsed;
				const key = `${bucket}/${filename}`;

				if (seen.has(key)) continue;
				seen.add(key);

				const publicUrl = `${this.url}/storage/v1/object/public/${bucket}/${filename}`;
				try {
					const signedUrl = await this.getSignedUrl(bucket, filename, expiresInSeconds);
					replacements.push({
						match: url,
						signedUrl,
						bucket,
						filename,
					});
				} catch (e: any) {
					logger.warn(
						'SupabaseUrlResolver.replaceUrls',
						`Error processing ${url}: ${e.message}`
					);
					replacements.push({
						match: url,
						signedUrl: publicUrl, // Fallback to public URL
						bucket,
						filename,
					});
				}
			}
		}

		if (replacements.length === 0) {
			logger.info('SupabaseUrlResolver.replaceUrls', 'No Supabase Storage URLs found in content');
			return content;
		}

		logger.info('SupabaseUrlResolver.replaceUrls', `Replacing ${replacements.length} Supabase URL(s)`);

		let result = content;
		for (const { match, signedUrl } of replacements) {
			result = result.replaceAll(match, signedUrl);
		}

		return result;
	}
}

/**
 * Global singleton resolver instance.
 */
const _resolver: SupabaseUrlResolver | null = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
	? new SupabaseUrlResolver()
	: null;

/**
 * Replace all Supabase Storage public URLs in post content with signed URLs.
 * Falls back to public URLs if the service key is unavailable or signing fails.
 *
 * @param content - Post content with potential Supabase Storage URLs
 * @param expiresInSeconds - Signed URL expiration time (default 1 hour)
 * @returns Promise resolving to the content with replaced URLs
 */
export async function replaceSupabaseUrls(content: string, expiresInSeconds = 3600): Promise<string> {
	if (!_resolver) {
		logger.warn('replaceSupabaseUrls', 'Resolver not initialized (missing SUPABASE_URL or SUPABASE_SERVICE_KEY), returning content unchanged');
		return content;
	}

	return _resolver.replaceUrls(content, expiresInSeconds);
}
