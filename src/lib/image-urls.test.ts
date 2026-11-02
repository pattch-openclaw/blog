import { describe, it, expect } from 'vitest';
import {
	isImageKitUrl,
	withImageKitTransform,
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
