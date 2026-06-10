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

// --- Mock builders ---

function buildMockDb(rows: MediaEntry[]) {
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

	return {
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
	};
}

function buildMockStorage() {
	const uploadedFiles: Array<{ bucket: string; path: string; file: File }> = [];
	const deletedFiles: Array<{ bucket: string; paths: string[] }> = [];

	const storage = {
		from(bucket: string) {
			return {
				async upload(path: string, file: File, _opts?: { upsert: boolean }) {
					uploadedFiles.push({ bucket, path, file });
					return { data: [{ path }], error: null };
				},
				async remove(paths: string[]) {
					deletedFiles.push({ bucket, paths });
					return { error: null };
				},
			};
		},
		getUploadedFiles: () => uploadedFiles,
		getDeletedFiles: () => deletedFiles,
	};

	return { storage };
}

function buildErrorStorage(uploadError: Error | null = null, removeError: Error | null = null) {
	return {
		storage: {
			from: () => ({
				upload: () => Promise.resolve({ data: uploadError ? null : [{ path: 'test' }], error: uploadError }),
				remove: () => Promise.resolve({ error: removeError }),
			}),
		},
	};
}

// --- Tests ---

describe('SupabaseMediaStore', () => {
	let store: SupabaseMediaStore;
	let mockDb: ReturnType<typeof buildMockDb>;
	let mockStorage: ReturnType<typeof buildMockStorage>;

	beforeEach(() => {
		mockDb = buildMockDb([...mockMediaRows]);
		mockStorage = buildMockStorage();
		store = new SupabaseMediaStore(mockDb as any, mockStorage as any);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('constructor', () => {
		test('accepts mock db and storage', () => {
			const mDb = buildMockDb([]);
			const mStorage = buildMockStorage();
			const s = new SupabaseMediaStore(mDb as any, mStorage as any);
			expect(s).toBeDefined();
		});
	});

	describe('listMedia', () => {
		test('returns all media entries sorted descending', async () => {
			const entries = await store.listMedia();
			expect(entries).toHaveLength(3);
		});

		test('returns empty array when no entries exist', async () => {
			const emptyDb = buildMockDb([]);
			const emptyStore = new SupabaseMediaStore(emptyDb as any, mockStorage as any);
			const entries = await emptyStore.listMedia();
			expect(entries).toEqual([]);
		});

		test('includes public_url for each entry', async () => {
			const entries = await store.listMedia();
			expect(entries.every((e) => e.public_url.startsWith('https://'))).toBe(true);
		});

		test('propagates Supabase errors', async () => {
			const errorDb: any = {
				from: () => ({
					select: () => ({
						order: () => Promise.resolve({ data: null, error: { message: 'Connection failed' } }),
					}),
				}),
			};
			const errorStorage = buildErrorStorage();
			const errorStore = new SupabaseMediaStore(errorDb, errorStorage as any);
			await expect(errorStore.listMedia()).rejects.toThrow('Connection failed');
		});

		test('handles null data gracefully', async () => {
			const nullDb: any = {
				from: () => ({
					select: () => ({
						order: () => Promise.resolve({ data: null, error: null }),
					}),
				}),
			};
			const nullStorage = buildErrorStorage();
			const nullStore = new SupabaseMediaStore(nullDb, nullStorage as any);
			const entries = await nullStore.listMedia();
			expect(entries).toEqual([]);
		});
	});

	describe('uploadMedia', () => {
		test('uploads file to Supabase Storage and inserts media_entries row', async () => {
			const testFile = new File(['test content'], 'test-image.png', { type: 'image/png' });
			const result = await store.uploadMedia(testFile, 'images');

			expect(result.filename).toBe('test-image.png');
			expect(result.bucket).toBe('images');
			expect(result.mime_type).toBe('image/png');
			expect(result.size).toBe(12);
			expect(result.public_url).toContain('images/test-image.png');
		});

		test('sanitizes filenames with special characters', async () => {
			const testFile = new File(['data'], 'my file (1).png', { type: 'image/png' });
			const result = await store.uploadMedia(testFile, 'images');
			expect(result.filename).toBe('my_file__1_.png');
		});

		test('rejects unsupported bucket names', async () => {
			const testFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
			await expect(store.uploadMedia(testFile as any, 'videos' as any)).rejects.toThrow('Unsupported bucket');
		});

		test('links entry to a post_id when provided', async () => {
			const testFile = new File(['data'], 'linked.png', { type: 'image/png' });
			const result = await store.uploadMedia(testFile, 'images', 'post-456');
			expect(result.post_id).toBe('post-456');
		});

		test('propagates Supabase Storage upload errors', async () => {
			const failStorage = buildErrorStorage(new Error('Upload failed'));
			const failDb = buildMockDb([...mockMediaRows]);
			const failStore = new SupabaseMediaStore(failDb as any, failStorage as any);
			const testFile = new File(['data'], 'fail.png', { type: 'image/png' });
			await expect(failStore.uploadMedia(testFile, 'images')).rejects.toThrow('Upload failed');
		});

		test('propagates Supabase insert errors', async () => {
			const failStorage = buildErrorStorage();
			const failDb: any = {
				from: () => ({
					insert: () => ({
						select: () => Promise.resolve({ data: null, error: { message: 'RLS denied' } }),
					}),
				}),
			};
			const failStore = new SupabaseMediaStore(failDb as any, failStorage as any);
			const testFile = new File(['data'], 'fail.png', { type: 'image/png' });
			await expect(failStore.uploadMedia(testFile, 'images')).rejects.toThrow('RLS denied');
		});

		test('supports audio bucket', async () => {
			const testFile = new File(['audio data'], 'song.mp3', { type: 'audio/mpeg' });
			const result = await store.uploadMedia(testFile, 'audio');
			expect(result.bucket).toBe('audio');
			expect(result.mime_type).toBe('audio/mpeg');
		});

		test('supports fonts bucket', async () => {
			const testFile = new File(['font data'], 'custom.woff2', { type: 'font/woff2' });
			const result = await store.uploadMedia(testFile, 'fonts');
			expect(result.bucket).toBe('fonts');
			expect(result.mime_type).toBe('font/woff2');
		});
	});

	describe('deleteMedia', () => {
		test('deletes from Supabase Storage and removes media_entries row', async () => {
			await store.deleteMedia(mockMediaRows[0]);

			const entries = await store.listMedia();
			expect(entries).toHaveLength(2);
			expect(entries.find((e) => e.id === 'media-001')).toBeUndefined();
		});

		test('handles storage delete errors but still removes DB row', async () => {
			const failStorage = buildErrorStorage(null, new Error('Storage error'));
			const failDb = buildMockDb([...mockMediaRows]);
			const failStore = new SupabaseMediaStore(failDb as any, failStorage as any);
			await expect(failStore.deleteMedia(mockMediaRows[0])).resolves.toBeUndefined();
		});

		test('propagates media_entries delete errors', async () => {
			const failDb: any = {
				from: () => ({
					delete: () => ({
						eq: () => Promise.resolve({ error: { message: 'DB error' } }),
					}),
				}),
			};
			const failStore = new SupabaseMediaStore(failDb, mockStorage as any);
			await expect(failStore.deleteMedia(mockMediaRows[0])).rejects.toThrow('DB error');
		});

		test('deletes audio entries', async () => {
			await store.deleteMedia(mockMediaRows[2]);
			const entries = await store.listMedia();
			expect(entries.find((e) => e.bucket === 'audio')).toBeUndefined();
		});

		test('deletes entries linked to a post', async () => {
			await store.deleteMedia(mockMediaRows[1]);
			const entries = await store.listMedia();
			expect(entries.find((e) => e.id === 'media-002')).toBeUndefined();
		});
	});
});
