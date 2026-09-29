import { expect, test, describe, vi, beforeEach } from 'vitest';
import { load } from './+page.server';

// Mock dependencies: media store listing, tag lookup, URL signing
const mockListMedia = vi.fn();
// Flip to make getMediaStore() itself throw (sync failure inside load's try —
// a rejected-promise mock gets misattributed as unhandled by vitest).
let failGetMediaStore = false;

vi.mock('$lib/server/posts', () => ({
	getMediaStore: () => {
		if (failGetMediaStore) throw new Error('store unavailable');
		return { listMedia: () => mockListMedia() };
	},
	getAllTags: async () => [],
	getStore: vi.fn(),
	getWriteStore: vi.fn(),
	getPosts: vi.fn(),
	getContentStore: () => 'git'
}));

vi.mock('$lib/server/supabase-url-resolver', () => ({
	replaceSupabaseUrls: async (url: string) => url
}));

vi.mock('$lib/logging', () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

function makeEntry(path: string, bucket = 'images') {
	const filename = path.slice(path.lastIndexOf('/') + 1);
	return {
		id: path,
		bucket,
		path,
		filename,
		mime_type: 'image/png',
		size: 1,
		public_url: `/media/${path.replace('media/', '')}`
	};
}

const asLoad = (url = 'http://localhost/admin/write') =>
	load({ url: new URL(url) } as any);

describe('write page load — gallery builder image data', () => {
	beforeEach(() => mockListMedia.mockReset());

	test('images carry bucket-relative rel and storage_path for the folder tree', async () => {
		mockListMedia.mockResolvedValue([
			makeEntry('media/images/trips/2026/beach.png'),
			makeEntry('media/images/root.png'),
			makeEntry('media/audio/song.mp3', 'audio')
		]);

		const result = await asLoad();
		expect(result.images).toHaveLength(2); // audio filtered out

		const beach = result.images.find((i) => i.filename === 'beach.png')!;
		expect(beach.rel).toBe('trips/2026/beach.png');
		expect(beach.storage_path).toBe('media/images/trips/2026/beach.png');
	});

	test('images are sorted by bucket-relative path (folders group together)', async () => {
		mockListMedia.mockResolvedValue([
			makeEntry('media/images/zzz.png'),
			makeEntry('media/images/trips/b.png'),
			makeEntry('media/images/trips/2026/a.png')
		]);

		const result = await asLoad();
		expect(result.images.map((i) => i.rel)).toEqual([
			'trips/2026/a.png',
			'trips/b.png',
			'zzz.png'
		]);
	});

	test('media store failure degrades to an empty image list', async () => {
		failGetMediaStore = true;
		try {
			const result = await asLoad();
			expect(result.images).toEqual([]);
		} finally {
			failGetMediaStore = false;
		}
	});
});
