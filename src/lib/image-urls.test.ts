import { describe, it, expect } from 'vitest';
import {
	isImageKitUrl,
	withImageKitTransform,
	fullSizeUrl,
	FULL_IMAGE_TRANSFORM,
	POST_IMAGE_TRANSFORM,
	THUMB_IMAGE_TRANSFORM
} from './image-urls';

describe('isImageKitUrl', () => {
	it('recognizes ImageKit CDN hosts', () => {
		expect(isImageKitUrl('https://ik.imagekit.io/sts/images/x.png')).toBe(true);
	});

	it('rejects other hosts and non-URLs', () => {
		expect(isImageKitUrl('https://proj.supabase.co/storage/v1/object/public/images/x.png')).toBe(false);
		expect(isImageKitUrl('/media/images/x.png')).toBe(false);
		expect(isImageKitUrl('https://ik.imagekit.io.evil.example/x.png')).toBe(false);
	});
});

describe('withImageKitTransform', () => {
	it('appends tr= to a bare ImageKit URL', () => {
		expect(withImageKitTransform('https://ik.imagekit.io/sts/images/x.png', POST_IMAGE_TRANSFORM)).toBe(
			'https://ik.imagekit.io/sts/images/x.png?tr=w-1200'
		);
	});

	it('joins with & when the URL already has a query', () => {
		expect(withImageKitTransform('https://ik.imagekit.io/sts/images/x.png?v=2', THUMB_IMAGE_TRANSFORM)).toBe(
			'https://ik.imagekit.io/sts/images/x.png?v=2&tr=w-300,h-300'
		);
	});

	it('is idempotent — a URL already carrying tr= is unchanged', () => {
		const once = withImageKitTransform('https://ik.imagekit.io/sts/x.png', POST_IMAGE_TRANSFORM);
		expect(withImageKitTransform(once, THUMB_IMAGE_TRANSFORM)).toBe(once);
	});

	it('non-ImageKit URLs pass through untouched', () => {
		expect(withImageKitTransform('/media/images/x.png', POST_IMAGE_TRANSFORM)).toBe('/media/images/x.png');
		expect(withImageKitTransform('https://example.com/x.png', POST_IMAGE_TRANSFORM)).toBe(
			'https://example.com/x.png'
		);
	});
});

describe('fullSizeUrl', () => {
	const CDN = 'https://ik.imagekit.io/sts/storage/v1/object/public/images';

	it('serves the original by default: full size means no transform at all', () => {
		// documents the knob in image-urls.ts — set it to 'w-2400' (or any
		// variant) to cap very large originals instead, and this behavior follows
		expect(FULL_IMAGE_TRANSFORM).toBe('');
	});

	it('returns a bare CDN URL byte-for-byte, adding no transform', () => {
		expect(fullSizeUrl(`${CDN}/x.png`)).toBe(`${CDN}/x.png`);
	});

	it('strips a transform that is already in the URL', () => {
		expect(fullSizeUrl(`${CDN}/x.png?tr=w-1200`)).toBe(`${CDN}/x.png`);
		expect(fullSizeUrl(`${CDN}/x.png?tr=w-1200,h-800`)).toBe(`${CDN}/x.png`);
	});

	it('keeps unrelated query params when removing the transform', () => {
		expect(fullSizeUrl(`${CDN}/x.png?v=2&tr=w-1200`)).toBe(`${CDN}/x.png?v=2`);
	});

	it('only removes a real tr= param, never one that merely contains "tr"', () => {
		expect(fullSizeUrl(`${CDN}/x.png?extra=1`)).toBe(`${CDN}/x.png?extra=1`);
		expect(fullSizeUrl(`${CDN}/x.png?country=nz`)).toBe(`${CDN}/x.png?country=nz`);
	});

	it('non-ImageKit URLs are their own original, and pass through untouched', () => {
		expect(fullSizeUrl('/media/images/x.png')).toBe('/media/images/x.png');
		expect(fullSizeUrl('https://example.com/x.png?tr=w-1200')).toBe('https://example.com/x.png?tr=w-1200');
	});

	it('the rendered link and the rendered src differ only by the transform', () => {
		// the invariant the renderers rely on: same file, two sizes
		const bare = `${CDN}/x.png`;
		expect(withImageKitTransform(fullSizeUrl(bare), POST_IMAGE_TRANSFORM)).toBe(`${bare}?tr=w-1200`);
		expect(fullSizeUrl(bare)).not.toContain('tr=');
	});
});
