import { describe, it, expect } from 'vitest';
import { parsePostContent } from './index';
import { renderGallery, extractImages, escapeAttr } from './gallery';

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

describe('renderGallery', () => {
	it('marks the first image active in main and thumbs', () => {
		const html = renderGallery('![one](/a.png)\n![two](/b.png)\n![three](/c.png)');
		// exactly one active thumb
		expect(html.match(/gallery-thumb is-active/g)?.length).toBe(1);
		expect(html).toContain('aria-current="true"');
		// main image is the first
		expect(html).toContain('<div class="gallery-main"><img src="/a.png" alt="one"');
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
