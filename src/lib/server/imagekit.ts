/**
 * Server-side rewrite: Supabase Storage URLs → ImageKit CDN URLs.
 *
 * Runs on the raw markdown/content string before parsing (same position the
 * old signed-URL replacement occupied), so image URLs inside directive
 * bodies are rewritten as usual. Pure string work — no Supabase client, no
 * network. When `IMAGEKIT_URL` is unset this is a no-op and plain public
 * Supabase URLs keep working (the `images` bucket is public).
 *
 * URL shape (verified against the live CDN): the ImageKit origin is
 * configured with the Supabase project root as its base, so the rewrite
 * only swaps the origin and keeps the full `/storage/v1/object/...` path:
 *   https://<proj>.supabase.co/storage/v1/object/public/images/x.png
 *   → https://ik.imagekit.io/sts/storage/v1/object/public/images/x.png
 *
 * Legacy signed URLs (`/object/sign/...?token=*** are also rewritten to
 * the public path with the token stripped — the bucket is public now, and
 * carrying an expiring token through the CDN would break both caching and
 * the link itself.
 */

/** Configured ImageKit endpoint (no trailing slash), or null if unset. */
export function getImageKitEndpoint(): string | null {
	const value = process.env.IMAGEKIT_URL?.trim().replace(/\/+$/, '');
	return value || null;
}

/**
 * Rewrite every Supabase Storage URL (public or legacy signed) in `content`
 * to the corresponding public path under the ImageKit endpoint.
 * Idempotent: the pattern only matches `*.supabase.co` hosts, and rewritten
 * URLs are ImageKit hosts.
 */
export function rewriteToImageKit(content: string): string {
	const endpoint = getImageKitEndpoint();

	if (!endpoint) return content;

	return content.replace(
		/https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/(?:public|sign)\/images\/(?:images\/)?([^\s"'()<>\]?]+)(?:\?[^\s"'()<>\]]*)?/gi,
		(_match, path: string) => `${endpoint}/${path}`
	);
}
