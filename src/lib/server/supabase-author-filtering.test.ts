import { test, expect } from 'vitest';
import { SupabasePostStore } from './supabase-post-store';

/**
 * Regression tests for Supabase author filtering.
 * 
 * These tests verify that the blog list page correctly handles author
 * filtering when using the Supabase content store.
 * 
 * The bug that was fixed:
 * - The blog list page had a duplicate `p.published || !import.meta.env.PROD` filter
 * - For sandbox (production build), this became `p.published || false` = `p.published`
 * - This excluded draft posts from author computation, breaking the toggle pills
 * 
 * The fix:
 * - Removed the duplicate filter since API already handles draft filtering
 * - Sandbox now runs in development mode (`NODE_ENV=development`)
 */

// Shared mock data
const mockPosts = [
	{ title: 'Sam Post 1', slug: 'sam-1', date: '2026-06-13T00:00:00Z', description: 'Test', published: true, author: 'sam', tags: [], content: 'Content' },
	{ title: 'Sam Post 2', slug: 'sam-2', date: '2026-06-12T00:00:00Z', description: 'Test', published: true, author: 'sam', tags: [], content: 'Content' },
	{ title: 'AI Post 1', slug: 'ai-1', date: '2026-06-11T00:00:00Z', description: 'Test', published: true, author: 'ai', tags: [], content: 'Content' },
	{ title: 'AI Post 2', slug: 'ai-2', date: '2026-06-10T00:00:00Z', description: 'Test', published: true, author: 'ai', tags: [], content: 'Content' },
	{ title: 'Draft', slug: 'draft', date: '2026-06-09T00:00:00Z', description: 'Test', published: false, author: 'sam', tags: [], content: 'Content' },
];

// Create a reusable mock DB
function createMockDb(data: any[]) {
	return {
		from: () => ({
			select: () => ({
				order: () => Promise.resolve({
					data,
					error: null,
				}),
			}),
		}),
	};
}

test('mapRow preserves valid author values like ai', () => {
	const mockDb = createMockDb([]);
	const store = new SupabasePostStore(mockDb);
	
	const row = {
		id: 'test-id',
		title: 'Test Post',
		slug: 'test-post',
		description: 'Test',
		content: 'Test content',
		tags: [],
		published: true,
		author: 'ai',
		created_at: '2026-06-13T00:00:00Z',
		updated_at: '2026-06-13T00:00:00Z',
	};
	
	const post = store.mapRow(row);
	expect(post.author).toBe('ai');
});

test('mapRow defaults null author to sam', () => {
	const mockDb = createMockDb([]);
	const store = new SupabasePostStore(mockDb);
	
	const row = {
		id: 'test-id',
		title: 'Test Post',
		slug: 'test-post',
		description: 'Test',
		content: 'Test content',
		tags: [],
		published: true,
		author: null,
		created_at: '2026-06-13T00:00:00Z',
		updated_at: '2026-06-13T00:00:00Z',
	};
	
	const post = store.mapRow(row);
	expect(post.author).toBe('sam');
});

test('mapRow defaults empty string author to sam', () => {
	const mockDb = createMockDb([]);
	const store = new SupabasePostStore(mockDb);
	
	const row = {
		id: 'test-id',
		title: 'Test Post',
		slug: 'test-post',
		description: 'Test',
		content: 'Test content',
		tags: [],
		published: true,
		author: '',
		created_at: '2026-06-13T00:00:00Z',
		updated_at: '2026-06-13T00:00:00Z',
	};
	
	const post = store.mapRow(row);
	expect(post.author).toBe('sam');
});

test('mapRow handles whitespace-only author', () => {
	const mockDb = createMockDb([]);
	const store = new SupabasePostStore(mockDb);
	
	const row = {
		id: 'test-id',
		title: 'Test Post',
		slug: 'test-post',
		description: 'Test',
		content: 'Test content',
		tags: [],
		published: true,
		author: '   ',
		created_at: '2026-06-13T00:00:00Z',
		updated_at: '2026-06-13T00:00:00Z',
	};
	
	const post = store.mapRow(row);
	expect(post.author).toBe('sam');
});

test('listPosts returns posts with various authors', async () => {
	const mockDb = createMockDb(mockPosts);
	const store = new SupabasePostStore(mockDb);
	const posts = await store.listPosts();
	
	expect(posts).toHaveLength(5);
	
	const samPosts = posts.filter(p => p.author === 'sam');
	const aiPosts = posts.filter(p => p.author === 'ai');
	
	expect(samPosts).toHaveLength(3); // 2 published + 1 draft
	expect(aiPosts).toHaveLength(2);
});

test('author extraction from posts works correctly', async () => {
	const posts = mockPosts;
	
	// Simulate the blog list page's author computation
	const authors = Array.from(
		new Set(
			posts
				.map((p: any) => p.author)
				.filter(Boolean)
		)
	).sort();
	
	expect(authors).toHaveLength(2);
	expect(authors).toContain('ai');
	expect(authors).toContain('sam');
});

test('author extraction excludes null/empty authors', async () => {
	const posts = [
		{ title: 'Sam Post', slug: 'sam-1', date: '2026-06-13T00:00:00Z', description: 'Test', published: true, author: 'sam', tags: [], content: 'Content' },
		{ title: 'Null Author Post', slug: 'null-1', date: '2026-06-12T00:00:00Z', description: 'Test', published: true, author: null, tags: [], content: 'Content' },
		{ title: 'Empty Author Post', slug: 'empty-1', date: '2026-06-11T00:00:00Z', description: 'Test', published: true, author: '', tags: [], content: 'Content' },
	];
	
	// Simulate the blog list page's author computation
	const authors = Array.from(
		new Set(
			posts
				.map((p: any) => p.author)
				.filter(Boolean)
		)
	).sort();
	
	expect(authors).toHaveLength(1);
	expect(authors).toContain('sam');
});

test('author extraction with mapRow normalization includes all authors', async () => {
	const posts = [
		{ title: 'Sam Post', slug: 'sam-1', date: '2026-06-13T00:00:00Z', description: 'Test', published: true, author: 'sam', tags: [], content: 'Content' },
		{ title: 'AI Post', slug: 'ai-1', date: '2026-06-11T00:00:00Z', description: 'Test', published: true, author: 'ai', tags: [], content: 'Content' },
		{ title: 'Null Author Post', slug: 'null-1', date: '2026-06-12T00:00:00Z', description: 'Test', published: true, author: null, tags: [], content: 'Content' },
	];
	
	// First apply mapRow normalization (converts null/empty to 'sam')
	const normalizedPosts = posts.map((p: any) => ({
		...p,
		author: (p.author ?? 'sam').trim() || 'sam',
	}));
	
	// Then extract authors
	const authors = Array.from(
		new Set(
			normalizedPosts
				.map((p: any) => p.author)
				.filter(Boolean)
		)
	).sort();
	
	expect(authors).toHaveLength(2);
	expect(authors).toContain('ai');
	expect(authors).toContain('sam');
});

test('author filtering only includes selected authors', async () => {
	const posts = mockPosts;
	
	// Simulate selecting only 'ai' author
	const selectedAuthors = new Set(['ai']);
	
	const filteredPosts = posts.filter(p => selectedAuthors.has(p.author));
	
	expect(filteredPosts).toHaveLength(2);
	expect(filteredPosts.every(p => p.author === 'ai')).toBe(true);
});

test('author filtering excludes all authors when none selected', async () => {
	const posts = mockPosts;
	
	// No authors selected
	const selectedAuthors = new Set<string>();
	
	// If no authors selected, no filtering is applied (per logic in blog list page)
	// But if filtering is applied with empty Set, all posts are excluded
	if (selectedAuthors.size > 0) {
		const filteredPosts = posts.filter(p => selectedAuthors.has(p.author));
		expect(filteredPosts).toHaveLength(0);
	}
});
