import { describe, it, expect, afterEach } from 'vitest';
import { getImageKitEndpoint, rewriteToImageKit } from './imagekit';

const EP = 'https://ik.imagekit.io/sts';
const savedEnv = process.env.IMAGEKIT_URL;

afterEach(() => {
	if (savedEnv === undefined) delete process.env.IMAGEKIT_URL;
	else process.env.IMAGEKIT_URL = savedEnv;
});

describe('getImageKitEndpoint', () => {
	it('reads IMAGEKIT_URL and trims trailing slashes/whitespace', () => {
		process.env.IMAGEKIT_URL = ' https://ik.imagekit.io/sts/ ';
		expect(getImageKitEndpoint()).toBe(EP);
	});

	it('returns null when unset or blank', () => {
		delete process.env.IMAGEKIT_URL;
		expect(getImageKitEndpoint()).toBeNull();
		process.env.IMAGEKIT_URL = '   ';
		expect(getImageKitEndpoint()).toBeNull();
	});
});

describe('rewriteToImageKit', () => {
	// Sanitized example URL:
	// const EXA = 'https://proj-abc.supabase.co/storage/v1/object/public/images/images/eu26/naples/general/IMG_9655.jpeg'
	const PUB = 'https://proj-abc.supabase.co/storage/v1/object/public/images/images/trips/x.png';

	it('rewrites public URLs to the endpoint, keeping the full path', () => {
		process.env.IMAGEKIT_URL = EP;
		expect(rewriteToImageKit(`![x](${PUB})`)).toBe(
			`![x](${EP}/trips/x.png)`
		);
	});

	it('rewrites legacy signed URLs to the public path, stripping the token', () => {
		process.env.IMAGEKIT_URL = EP;
		const signed =
			'https://proj-abc.supabase.co/storage/v1/object/sign/images/images/x.png?token=eyJhbGciOiJIUzI1NiJ9.eyJ1cmwiOie';
		expect(rewriteToImageKit(signed)).toBe(`${EP}/x.png`);
	});

	it('is idempotent', () => {
		process.env.IMAGEKIT_URL = EP;
		const once = rewriteToImageKit(PUB);
		expect(rewriteToImageKit(once)).toBe(once);
	});

	it('no-op when IMAGEKIT_URL is unset', () => {
		delete process.env.IMAGEKIT_URL;
		expect(rewriteToImageKit(PUB)).toBe(PUB);
	});

	it('leaves non-Supabase URLs and git /media paths alone', () => {
		process.env.IMAGEKIT_URL = EP;
		const md = '![a](/media/images/a.png) ![b](https://example.com/b.png)';
		expect(rewriteToImageKit(md)).toBe(md);
	});

	it('rewrites multiple URLs in one string, preserving markdown around them', () => {
		process.env.IMAGEKIT_URL = EP;
		const md =
			'Before ![a](https://p1.supabase.co/storage/v1/object/public/images/images/a.png) mid\n\n' +
			':::gallery\n![b](https://p2.supabase.co/storage/v1/object/public/images/images/nested/b.png "t")\n:::';
		const out = rewriteToImageKit(md);
		expect(out).toContain(`${EP}/a.png`);
		expect(out).toContain(`${EP}/nested/b.png "t"`);
		expect(out).not.toContain('supabase.co');
	});
});
