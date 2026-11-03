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

/**
 * Full-size variant, served when a reader clicks an image to look at it
 * closer (see `fullSizeLink`). An empty transform means no `tr=` param at all,
 * so ImageKit returns the original file from Supabase — that is still
 * CDN-cached like any other variant, so the Supabase origin is only fetched
 * once per edge-cache expiry. Set this to e.g. 'w-2400' to cap very large
 * originals while keeping a view much bigger than the in-post w-1200 render.
 */
export const FULL_IMAGE_TRANSFORM = '';

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

/**
 * The full-size URL a click-through link points at: an ImageKit URL with no
 * `tr=` param, which is the original file (or `FULL_IMAGE_TRANSFORM` when that
 * knob is set to a capped variant). Non-ImageKit URLs (git `/media/...`
 * paths, external images) are returned unchanged — their original is whatever
 * the URL already points at.
 *
 * Post content carries bare CDN URLs (the server rewrite drops queries), so
 * usually there is nothing to remove and the URL is returned byte-for-byte.
 * Stripping is explicit anyway so "full size" cannot silently degrade to a
 * hand-written or upstream-baked transform in content.
 */
export function fullSizeUrl(url: string): string {
	// A capped variant is requested: that is the "full size" we serve, and it
	// behaves like any other transform (idempotent, no-op off-CDN).
	if (FULL_IMAGE_TRANSFORM) return withImageKitTransform(url, FULL_IMAGE_TRANSFORM);
	if (!isImageKitUrl(url)) return url;
	try {
		const parsed = new URL(url);
		if (!parsed.searchParams.has('tr')) return url;
		parsed.searchParams.delete('tr');
		const query = parsed.searchParams.toString();
		return query ? `${parsed.origin}${parsed.pathname}?${query}` : `${parsed.origin}${parsed.pathname}`;
	} catch {
		return url;
	}
}
