/**
 * `:::gallery` directive — renders a set of markdown images as a
 * main-image + thumbnails gallery.
 *
 * Server output is complete static HTML (first image active). The client
 * handler in ./client.ts only ever moves the active state; nothing depends
 * on JavaScript being present to see the images.
 */
import { marked } from 'marked';
import {
	withImageKitTransform,
	POST_IMAGE_TRANSFORM,
	THUMB_IMAGE_TRANSFORM
} from '../image-urls';

export interface GalleryImage {
	href: string;
	alt: string;
}

/** Escape a string for safe use inside an HTML attribute value. */
export function escapeAttr(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * Collect all markdown images in the directive body, in document order.
 * Lexes the body and walks the token tree for `image` tokens, so images
 * work whether they appear on their own lines or inline in paragraphs.
 */
export function extractImages(body: string): GalleryImage[] {
	const images: GalleryImage[] = [];
	const walk = (tokens: unknown[]): void => {
		for (const token of tokens) {
			const t = token as { type?: string; href?: string; text?: string; tokens?: unknown[] };
			if (t.type === 'image' && typeof t.href === 'string' && t.href.length > 0) {
				images.push({ href: t.href, alt: t.text ?? '' });
			}
			if (Array.isArray(t.tokens)) walk(t.tokens);
		}
	};
	walk(marked.lexer(body));
	return images;
}

/** Render the gallery's static HTML. Falls back to plain markdown when no images. */
export function renderGallery(body: string): string {
	const images = extractImages(body);

	if (images.length === 0) {
		// Nothing to make a gallery from — degrade to normal rendering of the body.
		return `<div class="directive directive-plain" data-directive="gallery">${String(marked.parse(body)).trim()}</div>`;
	}

	// ImageKit URLs get per-context transforms: main/large at post width,
	// thumbnails as small squares. `data-full-src` carries the large variant
	// so the client thumb-swap shows full quality, not the tiny thumbnail
	// (client.ts falls back to the thumb's own src for non-ImageKit images).
	// Non-ImageKit URLs (git /media paths, external) pass through unchanged.
	const [first, ...rest] = images;
	const mainImg = `<img src="${escapeAttr(withImageKitTransform(first.href, POST_IMAGE_TRANSFORM))}" alt="${escapeAttr(first.alt)}" loading="lazy">`;

	const thumbs = [first, ...rest]
		.map((img, i) => {
			const active = i === 0 ? ' is-active' : '';
			const current = i === 0 ? ' aria-current="true"' : '';
			const label = `Show image ${i + 1}${img.alt ? `: ${escapeAttr(img.alt)}` : ''}`;
			const fullSrc = escapeAttr(withImageKitTransform(img.href, POST_IMAGE_TRANSFORM));
			return (
				`<button type="button" class="gallery-thumb${active}" data-index="${i}" ` +
				`data-alt="${escapeAttr(img.alt)}" data-full-src="${fullSrc}" aria-label="${label}"${current}>` +
				`<img src="${escapeAttr(withImageKitTransform(img.href, THUMB_IMAGE_TRANSFORM))}" alt="" loading="lazy"></button>`
			);
		})
		.join('');

	return (
		`<div class="directive directive-gallery" data-directive="gallery">` +
		`<div class="gallery-main">${mainImg}</div>` +
		`<div class="gallery-thumbs">${thumbs}</div>` +
		`</div>`
	);
}
