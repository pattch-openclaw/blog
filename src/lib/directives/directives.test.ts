import { describe, it, expect } from 'vitest';
import { parsePostContent } from './index';
import { renderGallery, extractImages } from './gallery';
import { escapeAttr } from './html';

describe('directive tokenizer', () => {
	it('renders a recognized directive via its renderer', () => {
		const html = parsePostContent(':::gallery\n![a](/a.png)\n![b](/b.png)\n:::');
		expect(html).toContain('data-directive="gallery"');
		expect(html).toContain('class="directive directive-gallery"');
	});

	it('leaves surrounding markdown intact', () => {
		const html = parsePostContent('Before\n\n:::gallery\n![a](/a.png)\n:::\n\nAfter');
		expect(html).toMatch(/^<p>Before<\/p>/);
		expect(html).toContain('<p>After</p>');
	});

	it('degrades unclosed directives to plain markdown', () => {
		const html = parsePostContent(':::gallery\nno close\n\nText');
		expect(html).not.toContain('data-directive');
		expect(html).toContain(':::gallery');
		expect(html).toContain('<p>Text</p>');
	});

	it('does not touch directive-like syntax inside code fences', () => {
		const html = parsePostContent('```md\n:::gallery\n![a](/a.png)\n:::\n```');
		expect(html).not.toContain('data-directive');
		expect(html).toContain('<code class="language-md">');
	});

	it('degrades unknown directives to plain markdown in a wrapper', () => {
		const html = parsePostContent(':::nope\n**bold**\n:::');
		expect(html).toContain('data-directive="nope"');
		expect(html).toContain('directive-unknown');
		expect(html).toContain('<strong>bold</strong>');
	});
});

describe('extractImages', () => {
	it('collects images in document order, own-line or inline', () => {
		const images = extractImages('![a](/a.png)\n\npara ![b](https://x/b.png "t") tail');
		expect(images).toEqual([
			{ href: '/a.png', alt: 'a' },
			{ href: 'https://x/b.png', alt: 'b' }
		]);
	});

	it('ignores non-image content', () => {
		expect(extractImages('just [a link](/x) and text')).toEqual([]);
	});
});

describe('ImageKit transforms in rendered HTML', () => {
	const CDN = 'https://ik.imagekit.io/sts/storage/v1/object/public/images';

	it('applies per-role transforms to gallery main/thumb and data-full-src', () => {
		const html = renderGallery(`![one](${CDN}/a.png)\n![two](${CDN}/b.png)`);
		// main image: post-width transform
		expect(html).toContain(`src="${CDN}/a.png?tr=w-1200" alt="one"`);
		// thumbnail <img>: square crop transform
		expect(html).toContain(`src="${CDN}/b.png?tr=w-300,h-300" alt=""`);
		// thumb carries both variants the client needs: post-size for the main
		// viewer, untransformed original for the click-through link
		expect(html).toContain(`data-main-src="${CDN}/b.png?tr=w-1200"`);
		expect(html).toContain(`data-full-src="${CDN}/b.png"`);
	});

	it('inline (non-gallery) images get the post-width transform via parsePostContent', () => {
		const html = parsePostContent(`![x](${CDN}/x.png)`);
		expect(html).toContain(`src="${CDN}/x.png?tr=w-1200"`);
	});

	it('gallery images are not double-transformed by the inline image renderer', () => {
		// Directive bodies are raw strings on the token, so the postMarked image
		// renderer never sees gallery images: one gallery image yields exactly
		// three tr= params (main img, thumb img, data-main-src) — the full-size
		// href and data-full-src stay bare — and they are never stacked.
		const html = parsePostContent(`:::gallery\n![a](${CDN}/a.png)\n:::`);
		const trCount = (html.match(/tr=/g) ?? []).length;
		expect(trCount).toBe(3); // main + thumb + data-main-src, no duplicates
		expect(html).not.toContain('&tr=');
	});
});

describe('full-size click-through links', () => {
	const CDN = 'https://ik.imagekit.io/sts/storage/v1/object/public/images';

	it('wraps a post-body image in a link to the same URL with no tr= param', () => {
		const html = parsePostContent(`![x](${CDN}/x.png)`);
		expect(html.match(/<a class="image-full"[^>]*>/)?.[0]).toBe(
			`<a class="image-full" href="${CDN}/x.png" target="_blank" rel="noopener">`
		);
		// the picture itself still renders at post width
		expect(html).toContain(`src="${CDN}/x.png?tr=w-1200"`);
		// …and the link closes around it, not after it
		expect(html).toContain('</a></p>');
	});

	it('keeps an author-written link target and never nests anchors', () => {
		const html = parsePostContent(`[![x](${CDN}/x.png)](https://example.com/dest)`);
		expect(html).toContain('<a href="https://example.com/dest">');
		expect(html).not.toContain('image-full');
		expect(html.match(/<a /g)?.length).toBe(1);
		// still rendered at post width
		expect(html).toContain(`src="${CDN}/x.png?tr=w-1200"`);
	});

	it('links the gallery main image to the full-size original', () => {
		const html = renderGallery(`![one](${CDN}/a.png)\n![two](${CDN}/b.png)`);
		expect(html).toContain(
			`<div class="gallery-main"><a class="image-full" href="${CDN}/a.png" target="_blank" rel="noopener">`
		);
		// every thumb advertises, in order, the full-size URL the client handler
		// (./client.ts) repoints that link to when the thumb is activated
		expect(html.match(/data-full-src="[^"]*"/g)).toEqual([
			`data-full-src="${CDN}/a.png"`,
			`data-full-src="${CDN}/b.png"`
		]);
	});

	it('non-ImageKit images link to their own original file, untransformed', () => {
		const html = parsePostContent('![x](/media/images/x.png)');
		expect(html).toContain('<a class="image-full" href="/media/images/x.png" target="_blank" rel="noopener">');
		expect(html).toContain('<img src="/media/images/x.png"');
		expect(html).not.toContain('tr=');
	});

	it('preserves a title attribute on the image', () => {
		const html = parsePostContent(`![x](${CDN}/x.png "hi")`);
		expect(html).toContain('title="hi"');
	});

	it('escapes quote-hostile URLs in the link href', () => {
		const html = parsePostContent('![a](/x.png?a=1&b="2")');
		expect(html.match(/href="[^"]*"/)?.[0]).toBe('href="/x.png?a=1&amp;b=&quot;2&quot;"');
	});
});

describe('renderGallery', () => {
	it('marks the first image active in main and thumbs', () => {
		const html = renderGallery('![one](/a.png)\n![two](/b.png)\n![three](/c.png)');
		// exactly one active thumb
		expect(html.match(/gallery-thumb is-active/g)?.length).toBe(1);
		expect(html).toContain('aria-current="true"');
		// main image is the first, wrapped in its full-size link
		expect(html).toContain(
			'<div class="gallery-main"><a class="image-full" href="/a.png" target="_blank" rel="noopener"><img src="/a.png" alt="one"'
		);
		// three thumbs
		// [ "] guard so the .gallery-thumbs container doesn't also match
		expect(html.match(/class="gallery-thumb[ "]/g)?.length).toBe(3);
		expect(html).toContain('data-index="2"');
	});

	it('escapes attribute-hostile alt text and URLs', () => {
		const html = renderGallery('![a"b<c>&d](/x.png?a=1&b="2")');
		expect(html).toContain('alt="a&quot;b&lt;c&gt;&amp;d"');
		expect(html).toContain('src="/x.png?a=1&amp;b=&quot;2&quot;"');
	});

	it('falls back to plain markdown rendering when body has no images', () => {
		const html = renderGallery('no images here');
		expect(html).toContain('directive-plain');
		expect(html).toContain('<p>no images here</p>');
	});
});

describe('escapeAttr', () => {
	it('escapes &, ", <, >', () => {
		expect(escapeAttr(`&"<>'x`)).toBe("&amp;&quot;&lt;&gt;'x");
	});
});
