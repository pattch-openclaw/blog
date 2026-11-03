// @vitest-environment jsdom
/**
 * Client directive behavior, exercised in a real DOM (jsdom) against real
 * renderer output — so the renderer ⇄ client contract (`data-main-src` /
 * `data-full-src` / `a.image-full`) is covered end to end without needing a
 * browser. Playwright still owns layout/visual behavior; this covers wiring.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { parsePostContent } from './index';
import { directives, galleryThumbSources } from './client';

const CDN = 'https://ik.imagekit.io/sts/storage/v1/object/public/images';

/** Mount post HTML in a container the way a page does: `<div class="prose" use:directives>`. */
function mountPost(markdown: string) {
	const container = document.createElement('div');
	container.className = 'prose';
	container.innerHTML = parsePostContent(markdown);
	document.body.append(container);
	const action = directives(container);
	return { container, cleanup: action.destroy };
}

function galleryMarkdown(...hrefs: string[]): string {
	return `:::gallery\n${hrefs.map((h, i) => `![img ${i + 1}](${h})`).join('\n')}\n:::`;
}

describe('galleryThumbSources', () => {
	it('keeps the post-size main view and the full-size link apart', () => {
		expect(
			galleryThumbSources(`${CDN}/a.png?tr=w-1200`, `${CDN}/a.png`, `${CDN}/a.png?tr=w-300,h-300`)
		).toEqual({ mainSrc: `${CDN}/a.png?tr=w-1200`, fullHref: `${CDN}/a.png` });
	});

	it('falls back to the thumb itself when no variants are advertised', () => {
		expect(galleryThumbSources(undefined, undefined, '/media/a.png')).toEqual({
			mainSrc: '/media/a.png',
			fullHref: '/media/a.png'
		});
	});

	it('never sends the click-through link to a URL that is not at least as big as the view', () => {
		// non-ImageKit URLs: the renderer emits the same URL in both attributes
		expect(galleryThumbSources('/media/a.png', '/media/a.png', '/media/a-thumb.png').fullHref).toBe(
			'/media/a.png'
		);
		// a thumb with only a full-size URL still keeps the link on that URL
		expect(galleryThumbSources(undefined, `${CDN}/a.png`, `${CDN}/a.png?tr=w-300`).fullHref).toBe(
			`${CDN}/a.png`
		);
	});
});

describe('gallery thumb activation (DOM)', () => {
	let mounted: { container: HTMLElement; cleanup: () => void } | undefined;
	afterEach(() => {
		mounted?.cleanup();
		mounted?.container.remove();
		mounted = undefined;
	});

	it('swaps the main image to the post-size variant, never the original or the thumb crop', () => {
		mounted = mountPost(galleryMarkdown(`${CDN}/a.png`, `${CDN}/b.png`));
		const { container } = mounted;
		const thumbs = Array.from(container.querySelectorAll<HTMLElement>('.gallery-thumb'));
		const main = container.querySelector<HTMLImageElement>('.gallery-main img')!;

		expect(main.getAttribute('src')).toBe(`${CDN}/a.png?tr=w-1200`);

		thumbs[1].click();

		expect(main.getAttribute('src')).toBe(`${CDN}/b.png?tr=w-1200`);
		expect(main.getAttribute('alt')).toBe('img 2');
	});

	it('repoints the full-size link at whichever image is on screen', () => {
		mounted = mountPost(galleryMarkdown(`${CDN}/a.png`, `${CDN}/b.png`, `${CDN}/c.png`));
		const { container } = mounted;
		const thumbs = Array.from(container.querySelectorAll<HTMLElement>('.gallery-thumb'));
		const link = container.querySelector<HTMLAnchorElement>('a.image-full')!;
		const main = container.querySelector<HTMLImageElement>('.gallery-main img')!;

		expect(link.getAttribute('href')).toBe(`${CDN}/a.png`);

		thumbs[2].click();
		expect(link.getAttribute('href')).toBe(`${CDN}/c.png`);
		// one link, still the full-size one (no tr=), still opening a new tab
		expect(container.querySelectorAll('a.image-full').length).toBe(1);
		expect(link.getAttribute('target')).toBe('_blank');
		expect(link.getAttribute('rel')).toBe('noopener');
		expect(link.getAttribute('href')).not.toMatch(/tr=/);
		// and the visible image is never the full original
		expect(main.getAttribute('src')).toMatch(/tr=w-1200$/);

		thumbs[1].click();
		expect(link.getAttribute('href')).toBe(`${CDN}/b.png`);
	});

	it('moves is-active/aria-current to the clicked thumb only', () => {
		mounted = mountPost(galleryMarkdown(`${CDN}/a.png`, `${CDN}/b.png`));
		const { container } = mounted;
		const thumbs = Array.from(container.querySelectorAll<HTMLElement>('.gallery-thumb'));

		thumbs[1].click();

		expect(thumbs[1].classList.contains('is-active')).toBe(true);
		expect(thumbs[1].getAttribute('aria-current')).toBe('true');
		expect(thumbs[0].classList.contains('is-active')).toBe(false);
		expect(thumbs[0].hasAttribute('aria-current')).toBe(false);
	});

	it('leaves main-image clicks to the browser (the link must keep working)', () => {
		mounted = mountPost(galleryMarkdown(`${CDN}/a.png`, `${CDN}/b.png`));
		const { container } = mounted;
		const main = container.querySelector<HTMLImageElement>('.gallery-main img')!;
		const link = container.querySelector<HTMLAnchorElement>('a.image-full')!;

		main.click();

		// no thumb was activated, nothing was swapped, the link is untouched
		expect(container.querySelectorAll('.gallery-thumb.is-active').length).toBe(1);
		expect(main.getAttribute('src')).toBe(`${CDN}/a.png?tr=w-1200`);
		expect(link.getAttribute('href')).toBe(`${CDN}/a.png`);
	});

	it('degrades gracefully for markup without the variant attributes', () => {
		// e.g. content rendered before data-main-src existed
		const container = document.createElement('div');
		container.innerHTML =
			`<div class="directive directive-gallery" data-directive="gallery">` +
			`<div class="gallery-main"><a class="image-full" href="/old-a.png"><img src="/old-a.png" alt="a"></a></div>` +
			`<div class="gallery-thumbs"><button type="button" class="gallery-thumb is-active" data-alt="a"><img src="/old-a.png"></button>` +
			`<button type="button" class="gallery-thumb" data-alt="b"><img src="/old-b.png"></button></div></div>`;
		document.body.append(container);
		const action = directives(container);
		mounted = { container, cleanup: action.destroy };

		const thumbs = Array.from(container.querySelectorAll<HTMLElement>('.gallery-thumb'));
		const main = container.querySelector<HTMLImageElement>('.gallery-main img')!;
		const link = container.querySelector<HTMLAnchorElement>('a.image-full')!;

		thumbs[1].click();

		// the fallback reads the thumb's own resolved src, so the swapped-in URL
		// is absolute exactly as the browser would resolve it
		const abs = (path: string) => new URL(path, document.baseURI).href;
		expect(main.getAttribute('src')).toBe(abs('/old-b.png'));
		expect(link.getAttribute('href')).toBe(abs('/old-b.png'));
	});

	it('scopes each container to its own galleries', () => {
		mounted = mountPost(galleryMarkdown(`${CDN}/a.png`, `${CDN}/b.png`));
		const other = document.createElement('div');
		other.innerHTML = parsePostContent(galleryMarkdown(`${CDN}/z.png`, `${CDN}/y.png`));
		document.body.append(other);
		const otherAction = directives(other);

		const ownThumbs = Array.from(mounted.container.querySelectorAll<HTMLElement>('.gallery-thumb'));
		const ownMain = mounted.container.querySelector<HTMLImageElement>('.gallery-main img')!;
		const otherThumbs = Array.from(other.querySelectorAll<HTMLElement>('.gallery-thumb'));
		const otherMain = other.querySelector<HTMLImageElement>('.gallery-main img')!;

		// a click bubbling out of the sibling container is handled by that
		// container's own action, never by this one — the delegated listeners
		// never cross-contaminate
		otherThumbs[1].click();

		expect(otherMain.getAttribute('src')).toBe(`${CDN}/y.png?tr=w-1200`);
		expect(ownThumbs[1].classList.contains('is-active')).toBe(false);
		expect(ownMain.getAttribute('src')).toBe(`${CDN}/a.png?tr=w-1200`);

		otherAction.destroy();
		other.remove();
	});
});
