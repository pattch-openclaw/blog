import { expect, test, vi, describe, beforeEach, afterEach } from 'vitest';
import type { Post } from './posts-store';
import { SupabasePostStore } from './supabase-post-store';

// Shared mock data.
const mockDbRows: Post[] = [
	{
		title: 'First Post',
		slug: 'first-post',
		description: 'The very first post.',
		date: '2026-06-01T00:00:00Z',
		published: true,
		author: 'sam',
		tags: ['test'],
		content: '## First Post\n\nHello world!',
	},
	{
		title: 'Second Post',
		slug: 'second-post',
		description: 'The second post.',
		date: '2026-05-30T00:00:00Z',
		published: true,
		author: 'sam',
		tags: ['sveltekit'],
		content: '## Second Post\n\nAnother post.',
	},
	{
		title: 'Draft Post',
		slug: 'draft-post',
		description: 'A draft.',
		date: '2026-05-28T00:00:00Z',
		published: false,
		author: 'sam',
		tags: [],
		content: '## Draft Post\n\nNot published yet.',
	},
];

/**
 * Build a mock db object that matches the narrow SupabaseQueryClient interface.
 * We track state via closures so the chain works correctly.
 */
function buildMockDb(rows: Post[]) {
	// State for the active query chain
	let state: {
		table: string | null;
		selectCols: string | null;
		orderAsc: boolean | null;
		eqCol: string | null;
		eqVal: string | null;
		insertData: Record<string, unknown> | null;
		updateData: Record<string, unknown> | null;
	} = {
		table: null,
		selectCols: null,
		orderAsc: null,
		eqCol: null,
		eqVal: null,
		insertData: null,
		updateData: null,
	};

	// Helper to get sorted list
	function getList() {
		return rows
			.slice()
			.sort((a, b) => {
				if (state.orderAsc === false) {
					return new Date(b.date).getTime() - new Date(a.date).getTime();
				}
				return new Date(a.date).getTime() - new Date(b.date).getTime();
			});
	}

	// Helper to get single by slug
	function getSingle() {
		if (!state.eqCol || state.eqCol !== 'slug' || !state.eqVal) return null;
		return rows.find((r) => r.slug === state.eqVal) || null;
	}

	// Build the shared select result object
	const selectResult: any = {
		order(_col: string, opts: { ascending: boolean }) {
			state.orderAsc = opts.ascending;
			// In Supabase JS v2, .order() returns a Promise
			return Promise.resolve({
				data: getList(),
				error: null,
			});
		},
		maybeSingle() {
			return Promise.resolve({
				data: getSingle(),
				error: null,
			});
		},
		// .eq() is called BEFORE .maybeSingle() in getPost: select().eq().maybeSingle()
		// So selectResult needs eq() to return itself
		eq(col: string, val: unknown) {
			state.eqCol = col;
			state.eqVal = String(val);
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
					return {
						select() {
							const newRow = {
								id: 'inserted-id',
								title: (record.title as string) ?? '',
								slug: (record.slug as string) ?? '',
								description: (record.description as string) ?? '',
								content: (record.content as string) ?? '',
								tags: (record.tags as string[]) ?? [],
								published: false,
								created_at: new Date().toISOString(),
								updated_at: new Date().toISOString(),
							};
							// Real Supabase .insert().select() returns a Promise
							return Promise.resolve({ data: [newRow], error: null });
						},
					};
				},
				update(record: Record<string, unknown>) {
					state.updateData = record;
					return {
						eq(col: string, val: unknown) {
							state.eqCol = col;
							state.eqVal = String(val);
							return {
								select() {
									const found = getSingle();
									if (!found) return Promise.resolve({ data: [], error: null });
									const updated = { ...found, ...record } as Record<string, unknown>;
									updated.id = 'updated-id';
									// Real Supabase .update().eq().select() returns a Promise
									return Promise.resolve({ data: [updated], error: null });
								},
							};
						},
					};
				},
				delete() {
					return {
						eq(_col: string, _val: unknown) {
							return () => Promise.resolve({ error: null });
						},
					};
				},
			};
		},
	};
}

describe('SupabasePostStore', () => {
	let store: SupabasePostStore;
	let mockDb: ReturnType<typeof buildMockDb>;

	beforeEach(() => {
		mockDb = buildMockDb(mockDbRows);
		store = new SupabasePostStore(mockDb as any);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('listPosts', () => {
		test('returns all posts sorted by date descending', async () => {
			const posts = await store.listPosts();
			expect(posts).toHaveLength(3);
			expect(posts[0].title).toBe('First Post');
			expect(posts[1].title).toBe('Second Post');
			expect(posts[2].title).toBe('Draft Post');
		});

		test('returns posts with correct metadata', async () => {
			const posts = await store.listPosts();
			expect(posts[0].slug).toBe('first-post');
			expect(posts[0].published).toBe(true);
			expect(posts[0].tags).toContain('test');
			expect(posts[2].published).toBe(false);
			expect(posts[2].tags).toEqual([]);
		});
	});

	describe('getPost', () => {
		test('returns a post for an existing slug', async () => {
			const post = await store.getPost('first-post');
			expect(post).not.toBeNull();
			expect(post!.title).toBe('First Post');
			expect(post!.slug).toBe('first-post');
			expect(post!.description).toBe('The very first post.');
			expect(post!.published).toBe(true);
			expect(post!.tags).toContain('test');
			expect(post!.content).toContain('Hello world!');
		});

		test('returns the correct post for different slugs', async () => {
			const post2 = await store.getPost('second-post');
			expect(post2!.slug).toBe('second-post');
			expect(post2!.tags).toContain('sveltekit');

			const draft = await store.getPost('draft-post');
			expect(draft!.published).toBe(false);
		});

		test('returns null for a non-existent slug', async () => {
			const post = await store.getPost('does-not-exist');
			expect(post).toBeNull();
		});
	});

	describe('savePost', () => {
		test('creates a new post with published: false', async () => {
			const newPost = await store.savePost({
				title: 'New Post',
				slug: 'new-post',
				description: 'A brand new post.',
				content: '## New Post\n\nHello!',
				author: 'sam',
				tags: ['new'],
			});

			expect(newPost).not.toBeNull();
			expect(newPost.title).toBe('New Post');
			expect(newPost.slug).toBe('new-post');
			expect(newPost.published).toBe(false);
			expect(newPost.tags).toContain('new');
			expect(newPost.content).toContain('Hello!');
		});

		test('handles empty tags array', async () => {
			const newPost = await store.savePost({
				title: 'No Tags',
				slug: 'no-tags',
				description: 'No tags here.',
				content: '## No Tags',
				author: 'sam',
				tags: [],
			});
			expect(newPost.tags).toEqual([]);
		});
	});

	describe('updatePost', () => {
		test('updates title and description', async () => {
			const updated = await store.updatePost('first-post', {
				title: 'Updated First Post',
				description: 'Updated description.',
			});

			expect(updated.title).toBe('Updated First Post');
			expect(updated.description).toBe('Updated description.');
		});

		test('updates published status', async () => {
			const updated = await store.updatePost('draft-post', { published: true });
			expect(updated.published).toBe(true);
		});

		test('updates tags', async () => {
			const updated = await store.updatePost('first-post', { tags: ['updated', 'tags'] });
			expect(updated.tags).toContain('updated');
			expect(updated.tags).toContain('tags');
		});
	});

	describe('deletePost', () => {
		test('deletes a post by slug without error', async () => {
			await expect(store.deletePost('first-post')).resolves.toBeUndefined();
		});

		test('deleting a non-existent post does not throw', async () => {
			await expect(store.deletePost('non-existent')).resolves.toBeUndefined();
		});
	});
});
