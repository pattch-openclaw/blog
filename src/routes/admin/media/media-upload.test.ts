import { expect, test, describe, vi, beforeEach } from 'vitest';
import { actions } from './+page.server';

// Mock the dependencies
const mockUploadMedia = vi.fn();
const mockGetMediaStore = vi.fn();

vi.mock('$lib/server/media-store', () => ({
	getMediaStore: () => mockGetMediaStore(),
}));

vi.mock('$lib/logging', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		agent: vi.fn(),
	},
}));

function makeEntry(filename: string, bucket: string) {
	return {
		id: `id-${filename}`,
		bucket,
		path: `${bucket}/${filename}`,
		filename,
		mime_type: 'image/png',
		size: 123,
		public_url: `https://example.supabase.co/storage/v1/object/public/${bucket}/${filename}`,
	};
}

function requestWithFiles(files: [string, File][], type?: string) {
	const formData = new FormData();
	if (type !== undefined) formData.set('type', type);
	for (const [field, file] of files) formData.append(field, file);
	return { request: { formData: () => formData } } as any;
}

function pngFile(name: string) {
	return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
}

describe('admin media upload action (multi-file)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetMediaStore.mockReturnValue({ uploadMedia: mockUploadMedia });
	});

	test('uploads multiple files and returns all results', async () => {
		mockUploadMedia.mockImplementation(async (file: File, bucket: string) =>
			makeEntry(file.name, bucket)
		);

		const result = await actions.upload(
			requestWithFiles(
				[
					['files', pngFile('one.png')],
					['files', pngFile('two.png')],
					['files', pngFile('three.png')],
				],
				'images'
			)
		);

		expect(mockUploadMedia).toHaveBeenCalledTimes(3);
		expect(result).toMatchObject({ success: true });
		expect((result as any).uploaded).toHaveLength(3);
		expect((result as any).uploaded.map((u: any) => u.filename)).toEqual([
			'one.png',
			'two.png',
			'three.png',
		]);
		expect((result as any).failed).toBeUndefined();
	});

	test('uploads a single file unchanged in shape', async () => {
		mockUploadMedia.mockImplementation(async (file: File, bucket: string) =>
			makeEntry(file.name, bucket)
		);

		const result = await actions.upload(requestWithFiles([['files', pngFile('solo.png')]], 'images'));

		expect((result as any).uploaded).toHaveLength(1);
		expect((result as any).uploaded[0].path).toContain('images/solo.png');
	});

	test('skips empty file entries (no file selected)', async () => {
		const empty = new File([], '', { type: '' });
		const result = await actions.upload(
			requestWithFiles(
				[
					['files', empty],
				],
				'images'
			)
		);

		expect(result).toMatchObject({ status: 400 });
		expect((result as any).data?.error).toBe('No files uploaded');
		expect(mockUploadMedia).not.toHaveBeenCalled();
	});

	test('rejects invalid media type', async () => {
		const result = await actions.upload(
			requestWithFiles([['files', pngFile('one.png')]], 'evil')
		);

		expect(result).toMatchObject({ status: 400 });
		expect((result as any).data?.error).toBe('Invalid media type');
	});

	test('reports partial failures alongside successes', async () => {
		mockUploadMedia.mockImplementation(async (file: File, bucket: string) => {
			if (file.name === 'bad.png') throw new Error('Storage quota exceeded');
			return makeEntry(file.name, bucket);
		});

		const result = await actions.upload(
			requestWithFiles(
				[
					['files', pngFile('good.png')],
					['files', pngFile('bad.png')],
				],
				'images'
			)
		);

		expect(result).toMatchObject({ success: true });
		expect((result as any).uploaded).toHaveLength(1);
		expect((result as any).failed).toHaveLength(1);
		expect((result as any).failed[0]).toContain('bad.png');
		expect((result as any).failed[0]).toContain('Storage quota exceeded');
	});

	test('returns 500 when every upload fails', async () => {
		mockUploadMedia.mockRejectedValue(new Error('Network down'));

		const result = await actions.upload(
			requestWithFiles(
				[
					['files', pngFile('a.png')],
					['files', pngFile('b.png')],
				],
				'images'
			)
		);

		expect(result).toMatchObject({ status: 500 });
		expect((result as any).data?.error).toBe('All uploads failed');
		expect((result as any).data?.details).toContain('a.png');
		expect((result as any).data?.details).toContain('b.png');
	});
});
