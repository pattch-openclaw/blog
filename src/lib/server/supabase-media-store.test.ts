import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import type { MediaEntry } from './media-store';
import { SupabaseMediaStore } from './supabase-media-store';

// --- Shared mock data ---

const mockMediaRows: MediaEntry[] = [
	{
		id: 'media-001',
		bucket: 'images',
		path: 'images/logo.png',
		filename: 'logo.png',
		mime_type: 'image/png',
		size: 102400,
		post_id: null,
		public_url: 'https://example.supabase.co/storage/v1/object/public/images/logo.png',
	},
	{
		id: 'media-002',
		bucket: 'images',
		path: 'images/banner.webp',
		filename: 'banner.webp',
		mime_type: 'image/webp',
		size: 204800,
		post_id: 'post-123',
		public_url: 'https://example.supabase.co/storage/v1/object/public/images/banner.webp',
	},
	{
		id: 'media-003',
		bucket: 'audio',
		path: 'audio/podcast-ep1.mp3',
		filename: 'podcast-ep1.mp3',
		mime_type: 'audio/mpeg',
		size: 5242880,
		post_id: null,
		public_url: 'https://example.supabase.co/storage/v1/object/public/audio/podcast-ep1.mp3',
	},
];

// --- Mock builder ---

function buildMockClient(rows: MediaEntry[]) {
	let state: {
		table: string | null;
		eqCol: string | null;
		eqVal: unknown;
		insertData: Record<string, unknown> | null;
		orderAsc: boolean | null;
		selectCols: string | null;
	} = {
		table: null,
		eqCol: null,
		eqVal: null,
		insertData: null,
		orderAsc: null,
		selectCols: null,
	};

	function getList() {
		return rows
			.slice()
			.sort((a, b) => (state.orderAsc === false ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)));
	}

	const selectResult: any = {
		order(_col: string, opts: { ascending: boolean }) {
			state.orderAsc = opts.ascending;
			return Promise.resolve({ data: getList(), error: null });
		},
		maybeSingle() {
			if (!state.eqCol || !state.eqVal) return Promise.resolve({ data: null, error: null });
			const found = rows.find((r: any) => (r as any)[String(state.eqCol)] === state.eqVal);
			return Promise.resolve({ data: found ?? null, error: null });
		},
		eq(col: string, val: unknown) {
			state.eqCol = col;
			state.eqVal = val;
			return selectResult;
		},
	};

	const uploadedFiles: Array<{ bucket: string; path: string; file: File }> = [];
	const deletedFiles: Array<{ bucket: string; paths: string[] }> = [];
	let uploadErr: Error | null = null;
	let removeErr: Error | null = null;

	return {
		// DB query chain: client.from(table) -> select -> order/eq/etc
		from(table: string) {
			state.table = table;
			return {
				select(_cols?: string) {
					state.selectCols = _cols ?? null;
					return selectResult;
				},
				insert(record: Record<string, unknown>) {
					state.insertData = record;
					const newId = `inserted-${Date.now()}`;
					const newRow = {
						id: newId,
						bucket: (record.bucket as string) ?? 'images',
						path: (record.path as string) ?? `${(record.bucket as string)}/${(record.filename as string)}`,
						filename: (record.filename as string) ?? 'unknown',
						mime_type: (record.mime_type as string) ?? 'application/octet-stream',
						size: (record.size as number) ?? 0,
						post_id: (record.post_id as string | null) ?? null,
						uploaded_at: new Date().toISOString(),
					};
					rows.push(newRow as unknown as MediaEntry);
					return {
						select() {
							return Promise.resolve({ data: [newRow], error: null });
						},
					};
				},
				delete() {
					return {
						eq(col: string, val: unknown) {
							state.eqCol = col;
							state.eqVal = val;
							while (rows.length > rows.filter((r: any) => (r as any)[col] !== val).length) {
								const idx = rows.findIndex((r: any) => (r as any)[col] === val);
								if (idx !== -1) rows.splice(idx, 1);
							}
							return Promise.resolve({ error: null });
						},
					};
				},
			};
		},
		// Storage bucket API: client.storage.from(bucket) -> upload/remove
		storage: {
			from(bucket: string) {
				return {
					async upload(path: string, file: File, _opts?: { upsert: boolean }) {
						uploadedFiles.push({ bucket, path, file });
						return { data: [{ path }], error: uploadErr };
					},
					async remove(paths: string[]) {
						deletedFiles.push({ bucket, paths });
						return { error: removeErr };
					},
				};
			},
		},
		// Test helpers
		setUploadError(err: Error | null) { uploadErr = err; },
		setRemoveError(err: Error | null) { removeErr = err; },
		getUploadedFiles: () => uploadedFiles,
		getDeletedFiles: () => deletedFiles,
	} as any;
}

// --- Tests ---

describe('SupabaseMediaStore', () => {
	let mockClient: ReturnType<typeof buildMockClient>;

	beforeEach(() => {
		mockClient = buildMockClient([...mockMediaRows]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('constructor', () => {
		test('accepts mock client', () => {
			const store = new SupabaseMediaStore(mockClient);
			expect(store).toBeDefined();
		});
	});

	describe('listMedia', () => {
		test('returns all media entries sorted descending', async () => {
			const store = new SupabaseMediaStore(mockClient);
			const entries = await store.listMedia();
			expect(entries).toHaveLength(3);
		});

		test('returns empty array when no entries exist', async () => {
			const emptyClient = buildMockClient([]);
			const store = new SupabaseMediaStore(emptyClient);
			const entries = await store.listMedia();
			expect(entries).toEqual([]);
		});

		test('includes public_url for each entry', async () => {
			const store = new SupabaseMediaStore(mockClient);
			const entries = await store.listMedia();
			expect(entries.every((e) => e.public_url.startsWith('https://'))).toBe(true);
		});

		test('propagates Supabase errors', async () => {
			const errorClient = buildMockClient([...mockMediaRows]);
			errorClient.from = () => ({
				select: () => ({
					order: () => Promise.resolve({ data: null, error: { message: 'Connection failed' } }),
				}),
			});
			const store = new SupabaseMediaStore(errorClient);
			await expect(store.listMedia()).rejects.toThrow('Connection failed');
		});

		test('handles null data gracefully', async () => {
			const nullClient = buildMockClient([...mockMediaRows]);
			nullClient.from = () => ({
				select: () => ({
					order: () => Promise.resolve({ data: null, error: null }),
				}),
			});
			const store = new SupabaseMediaStore(nullClient);
			const entries = await store.listMedia();
			expect(entries).toEqual([]);
		});
	});

	describe('uploadMedia', () => {
		test('uploads file to Supabase Storage and inserts media_entries row', async () => {
			const store = new SupabaseMediaStore(mockClient);
			const testFile = new File(['test content'], 'test-image.png', { type: 'image/png' });
			const result = await store.uploadMedia(testFile, 'images');

			expect(result.filename).toBe('test-image.png');
			expect(result.bucket).toBe('images');
			expect(result.mime_type).toBe('image/png');
			expect(result.size).toBe(12);
			expect(result.public_url).toContain('images/test-image.png');
		});

		test('sanitizes filenames with special characters', async () => {
			const store = new SupabaseMediaStore(mockClient);
			const testFile = new File(['data'], 'my file (1).png', { type: 'image/png' });
			const result = await store.uploadMedia(testFile, 'images');
			expect(result.filename).toBe('my_file__1_.png');
		});

		test('rejects unsupported bucket names', async () => {
			const store = new SupabaseMediaStore(mockClient);
			const testFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
			await expect(store.uploadMedia(testFile as any, 'videos' as any)).rejects.toThrow('Unsupported bucket');
		});

		test('links entry to a post_id when provided', async () => {
			const store = new SupabaseMediaStore(mockClient);
			const testFile = new File(['data'], 'linked.png', { type: 'image/png' });
			const result = await store.uploadMedia(testFile, 'images', 'post-456');
			expect(result.post_id).toBe('post-456');
		});

		test('propagates Supabase Storage upload errors', async () => {
			const errClient = buildMockClient([...mockMediaRows]);
			errClient.setUploadError(new Error('Upload failed'));
			const store = new SupabaseMediaStore(errClient);
			const testFile = new File(['data'], 'fail.png', { type: 'image/png' });
			await expect(store.uploadMedia(testFile, 'images')).rejects.toThrow('Upload failed');
		});

		test('propagates Supabase insert errors', async () => {
			const errClient = buildMockClient([...mockMediaRows]);
			errClient.from = () => ({
				insert: () => ({
					select: () => Promise.resolve({ data: null, error: { message: 'RLS denied' } }),
				}),
			});
			const store = new SupabaseMediaStore(errClient);
			const testFile = new File(['data'], 'fail.png', { type: 'image/png' });
			await expect(store.uploadMedia(testFile, 'images')).rejects.toThrow('RLS denied');
		});

		test('supports audio bucket', async () => {
			const store = new SupabaseMediaStore(mockClient);
			const testFile = new File(['audio data'], 'song.mp3', { type: 'audio/mpeg' });
			const result = await store.uploadMedia(testFile, 'audio');
			expect(result.bucket).toBe('audio');
			expect(result.mime_type).toBe('audio/mpeg');
		});

		test('supports fonts bucket', async () => {
			const store = new SupabaseMediaStore(mockClient);
			const testFile = new File(['font data'], 'custom.woff2', { type: 'font/woff2' });
			const result = await store.uploadMedia(testFile, 'fonts');
			expect(result.bucket).toBe('fonts');
			expect(result.mime_type).toBe('font/woff2');
		});
	});

	describe('deleteMedia', () => {
		test('deletes from Supabase Storage and removes media_entries row', async () => {
			const store = new SupabaseMediaStore(mockClient);
			await store.deleteMedia(mockMediaRows[0]);

			const entries = await store.listMedia();
			expect(entries).toHaveLength(2);
			expect(entries.find((e) => e.id === 'media-001')).toBeUndefined();
		});

		test('handles storage delete errors but still removes DB row', async () => {
			const errClient = buildMockClient([...mockMediaRows]);
			errClient.setRemoveError(new Error('Storage error'));
			const store = new SupabaseMediaStore(errClient);
			await expect(store.deleteMedia(mockMediaRows[0])).resolves.toBeUndefined();
		});

		test('propagates media_entries delete errors', async () => {
			const errClient = buildMockClient([...mockMediaRows]);
			errClient.from = () => ({
				delete: () => ({
					eq: () => Promise.resolve({ error: { message: 'DB error' } }),
				}),
			});
			const store = new SupabaseMediaStore(errClient);
			await expect(store.deleteMedia(mockMediaRows[0])).rejects.toThrow('DB error');
		});

		test('deletes audio entries', async () => {
			const store = new SupabaseMediaStore(mockClient);
			await store.deleteMedia(mockMediaRows[2]);
			const entries = await store.listMedia();
			expect(entries.find((e) => e.bucket === 'audio')).toBeUndefined();
		});

		test('deletes entries linked to a post', async () => {
			const store = new SupabaseMediaStore(mockClient);
			await store.deleteMedia(mockMediaRows[1]);
			const entries = await store.listMedia();
			expect(entries.find((e) => e.id === 'media-002')).toBeUndefined();
		});
	});
});
