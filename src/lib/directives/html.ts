/**
 * Shared HTML helpers for the directive/markdown renderers.
 *
 * Directive and image output is built as static strings (see ./index.ts and
 * ./gallery.ts) so the same markup renders in post pages and the admin live
 * preview. Anything interpolated into an attribute goes through `escapeAttr`,
 * and any image that readers can click through to full size goes through
 * `fullSizeLink` so the affordance is identical everywhere.
 */

/** Escape a string for safe use inside an HTML attribute value. */
export function escapeAttr(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * Wrap rendered image HTML in a link to its full-size variant, opened in a
 * new tab. `fullSrc` comes from `fullSizeUrl` (src/lib/image-urls.ts); the
 * `image-full` class is styled in app.css (zoom cursor).
 *
 * `rel="noopener"` keeps the opened tab from holding a handle on the page —
 * the link is cross-origin (CDN) even where `target="_blank"` implies it.
 */
export function fullSizeLink(imageHtml: string, fullSrc: string): string {
	return (
		`<a class="image-full" href="${escapeAttr(fullSrc)}" target="_blank" rel="noopener">` +
		`${imageHtml}</a>`
	);
}
