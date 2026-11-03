/**
 * `:::gallery` directive — renders a set of markdown images as a
 * main-image + thumbnails gallery.
 *
 * Server output is complete static HTML (first image active). The client
 * handler in ./client.ts only ever moves the active state; nothing depends
 * on JavaScript being present to see the images. Clicking the main image
 * opens its full-size variant in a new tab, like any other post image.
 */
import { marked } from 'marked';
import {
	withImageKitTransform,
	fullSizeUrl,
	POST_IMAGE_TRANSFORM,
	THUMB_IMAGE_TRANSFORM
} from '../image-urls';
import { escapeAttr, fullSizeLink } from './html';
import { walkTokenTree } from './token-tree';

export interface GalleryImage {
	href: string;
	alt: string;
}

/**
 * Collect all markdown images in the directive body, in document order.
 * Lexes the body and walks the token tree for `image` tokens, so images
 * work whether they appear on their own lines or inline in paragraphs.
 */
export function extractImages(body: string): GalleryImage[] {
	const images: GalleryImage[] = [];
	walkTokenTree(marked.lexer(body), (token) => {
		if (token.type === 'image' && typeof token.href === 'string' && token.href.length > 0) {
			images.push({ href: token.href, alt: token.text ?? '' });
		}
	});
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
	// thumbnails as small squares. The two sizes the client needs to know
	// about travel on each thumb:
	//   data-main-src — post-size variant, swapped into the main viewer
	//   data-full-src — full-size original, opened by the click-through link
	// (`galleryThumbSources` in client.ts falls back to the thumb's own src when
	// neither attribute is present).
	// The main image is wrapped in the same full-size link standalone post
	// images get (see ./index.ts); the client repoints its href on thumb swap.
	// Non-ImageKit URLs (git /media paths, external) pass through unchanged.
	const [first, ...rest] = images;
	const mainImg = `<img src="${escapeAttr(withImageKitTransform(first.href, POST_IMAGE_TRANSFORM))}" alt="${escapeAttr(first.alt)}" loading="lazy">`;
	const mainView = fullSizeLink(mainImg, fullSizeUrl(first.href));

	const thumbs = [first, ...rest]
		.map((img, i) => {
			const active = i === 0 ? ' is-active' : '';
			const current = i === 0 ? ' aria-current="true"' : '';
			const label = `Show image ${i + 1}${img.alt ? `: ${escapeAttr(img.alt)}` : ''}`;
			const mainSrc = escapeAttr(withImageKitTransform(img.href, POST_IMAGE_TRANSFORM));
			const fullSrc = escapeAttr(fullSizeUrl(img.href));
			return (
				`<button type="button" class="gallery-thumb${active}" data-index="${i}" ` +
				`data-alt="${escapeAttr(img.alt)}" data-main-src="${mainSrc}" ` +
				`data-full-src="${fullSrc}" aria-label="${label}"${current}>` +
				`<img src="${escapeAttr(withImageKitTransform(img.href, THUMB_IMAGE_TRANSFORM))}" alt="" loading="lazy"></button>`
			);
		})
		.join('');

	return (
		`<div class="directive directive-gallery" data-directive="gallery">` +
		`<div class="gallery-main">${mainView}</div>` +
		`<div class="gallery-thumbs">${thumbs}</div>` +
		`</div>`
	);
}
