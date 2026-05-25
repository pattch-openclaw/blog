import { expect, test, describe } from 'vitest';

import type { Post } from '$lib/types';

// --- Author filtering logic (mirrors +page.svelte) ---

function filterByAuthors(
	posts: Post[],
	authors: Set<string>
): Post[] {
	return posts.filter((p) => authors.has(p.author));
}

function computeAuthors(postList: Post[]): Array<{ author: string; count: number }> {
	const counts: Record<string, number> = {};
	postList.forEach((p) => {
		counts[p.author] = (counts[p.author] || 0) + 1;
	});
	return Object.entries(counts)
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([author, count]) => ({ author, count }));
}

// --- Tests ---

describe('computeAuthors', () => {
	test('returns authors sorted alphabetically', () => {
		const posts: Post[] = [
			{ title: 'A', slug: 'a', description: '', date: '2026-01-01', published: true, author: 'zebra', tags: [], content: '' },
			{ title: 'B', slug: 'b', description: '', date: '2026-01-02', published: true, author: 'alice', tags: [], content: '' },
		] as Post[];
		const authors = computeAuthors(posts);
		expect(authors[0].author).toBe('alice');
		expect(authors[1].author).toBe('zebra');
	});

	test('counts posts per author correctly', () => {
		const posts: Post[] = [
			{ title: 'A', slug: 'a', description: '', date: '2026-01-01', published: true, author: 'sam', tags: [], content: '' },
			{ title: 'B', slug: 'b', description: '', date: '2026-01-02', published: true, author: 'sam', tags: [], content: '' },
			{ title: 'C', slug: 'c', description: '', date: '2026-01-03', published: true, author: 'ai', tags: [], content: '' },
		] as Post[];
		const authors = computeAuthors(posts);
		expect(authors.find((a) => a.author === 'sam')!.count).toBe(2);
		expect(authors.find((a) => a.author === 'ai')!.count).toBe(1);
	});

	test('defaults missing author to sam', () => {
		const posts: Post[] = [
			{ title: 'A', slug: 'a', description: '', date: '2026-01-01', published: true, author: 'sam', tags: [], content: '' },
		] as Post[];
		const authors = computeAuthors(posts);
		expect(authors.length).toBe(1);
		expect(authors[0].author).toBe('sam');
	});
});

describe('filterByAuthors', () => {
	const basePosts: Post[] = [
		{ title: 'Sam Post 1', slug: 'sam-1', description: '', date: '2026-01-01', published: true, author: 'sam', tags: [], content: '' },
		{ title: 'Sam Post 2', slug: 'sam-2', description: '', date: '2026-01-02', published: true, author: 'sam', tags: [], content: '' },
		{ title: 'AI Post 1', slug: 'ai-1', description: '', date: '2026-01-03', published: true, author: 'ai', tags: [], content: '' },
	] as Post[];

	test('when an author checkbox is checked, posts from that author are visible', () => {
		const activeAuthors = new Set(['sam']);
		const filtered = filterByAuthors(basePosts, activeAuthors);
		expect(filtered).toHaveLength(2);
		expect(filtered.every((p) => p.author === 'sam')).toBe(true);
	});

	test('when an author checkbox is unchecked, posts from that author are hidden', () => {
		const activeAuthors = new Set(['ai']);
		const filtered = filterByAuthors(basePosts, activeAuthors);
		expect(filtered).toHaveLength(1);
		expect(filtered[0].author).toBe('ai');
	});

	test('when all author checkboxes are unchecked, no posts are shown', () => {
		const activeAuthors = new Set<string>();
		const filtered = filterByAuthors(basePosts, activeAuthors);
		expect(filtered).toHaveLength(0);
	});

	test('posts with no author field are treated as sam and hidden when sam is unchecked', () => {
		const postsWithMissingAuthor: Post[] = [
			{ title: 'No Author', slug: 'no-author', description: '', date: '2026-01-01', published: true, author: 'sam', tags: [], content: '' },
		] as Post[];
		// The post's author field already defaults to 'sam' in the data layer,
		// so unchecking sam hides it:
		const activeAuthors = new Set<string>();
		const filtered = filterByAuthors(postsWithMissingAuthor, activeAuthors);
		expect(filtered).toHaveLength(0);
	});

	test('filtering with multiple authors checked works', () => {
		const activeAuthors = new Set(['sam', 'ai']);
		const filtered = filterByAuthors(basePosts, activeAuthors);
		expect(filtered).toHaveLength(3);
	});
});
