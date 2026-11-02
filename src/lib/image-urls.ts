/**
 * Pure ImageKit URL helpers shared by the server rewrite step and the
 * client-side directive renderers (the admin write preview parses in the
 * browser, so this module must not import `$env` or server-only code).
 *
 * Context: post content stores plain Supabase public URLs. At render time
 * the server rewrites their origin to the ImageKit endpoint
 * (`src/lib/server/imagekit.ts`); these helpers then append per-context
 * `?tr=` transforms based on the URL host alone, so they are safe to run in
 * any environment and are no-ops for non-ImageKit URLs (git `/media/...`
 * paths, external images, etc.).
 */

/** Max-width constraint for images displayed at post-body size. */
export const POST_IMAGE_TRANSFORM = 'w-1200';

/** Cropped square for gallery thumbnails. */
export const THUMB_IMAGE_TRANSFORM = 'w-300,h-300';

/** True if the URL points at an ImageKit CDN endpoint (ik.imagekit.io). */
export function isImageKitUrl(url: string): boolean {
	try {
		const host = new URL(url).hostname;
		return host === 'ik.imagekit.io' || host.endsWith('.ik.imagekit.io');
	} catch {
		return false;
	}
}

/**
 * Append an ImageKit transformation query (`tr=`) to an ImageKit URL.
 * Non-ImageKit URLs and empty transforms pass through unchanged. URLs that
 * already carry a `tr=` param are left alone (idempotent).
 */
export function withImageKitTransform(url: string, transform: string): string {
	if (!transform || url.includes('tr=') || !isImageKitUrl(url)) return url;
	const sep = url.includes('?') ? '&' : '?';
	return `${url}${sep}tr=${transform}`;
}
