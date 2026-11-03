import { describe, it, expect } from 'vitest';
import { buildGalleryMarkdown } from './gallery-markdown';

describe('buildGalleryMarkdown', () => {
	it('returns empty string for no selection', () => {
		expect(buildGalleryMarkdown([])).toBe('');
	});

	it('wraps selected images in a gallery directive, preserving click order', () => {
		const md = buildGalleryMarkdown([
			{ filename: 'b.png', public_url: 'https://x/images/b.png' },
			{ filename: 'a.png', public_url: '/media/images/a.png' }
		]);
		expect(md).toBe(
			':::gallery\n![b.png](https://x/images/b.png)\n![a.png](/media/images/a.png)\n:::\n'
		);
	});

	it('output round-trips through the directive parser into a gallery', async () => {
		const { parsePostContent } = await import('./index');
		const md = buildGalleryMarkdown([
			{ filename: 'one.png', public_url: '/media/images/one.png' },
			{ filename: 'two.jpg', public_url: 'https://proj.supabase.co/storage/v1/object/public/images/two.jpg' }
		]);
		const html = parsePostContent(md);
		expect(html).toContain('data-directive="gallery"');
		// [ "] guard so the .gallery-thumbs container doesn't also match
		expect(html.match(/class="gallery-thumb[ "]/g)?.length).toBe(2);
		// click order preserved: first selected becomes the active main image,
		// wrapped in a link to its own full-size URL (see directives/client.ts)
		expect(html).toContain(
			'<div class="gallery-main"><a class="image-full" href="/media/images/one.png" target="_blank" rel="noopener"><img src="/media/images/one.png"'
		);
	});

	it('single image is still valid gallery markdown', () => {
		const md = buildGalleryMarkdown([{ filename: 'x.png', public_url: '/x.png' }]);
		expect(md).toBe(':::gallery\n![x.png](/x.png)\n:::\n');
	});
});
