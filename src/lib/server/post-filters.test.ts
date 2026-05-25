import { describe, test, expect } from 'vitest';
import { filterPosts } from './post-filters';
import type { Post } from '$lib/types';

function mockPost(partial: Partial<Post>): Post {
	return {
		title: partial.title ?? 'Test',
		slug: partial.slug ?? 'test',
		description: partial.description ?? '',
		date: partial.date ?? '2026-01-01T00:00:00Z',
		published: partial.published ?? true,
		author: partial.author ?? 'sam',
		tags: partial.tags ?? [],
		content: partial.content ?? '',
	} as Post;
}

const basePosts: Post[] = [
	mockPost({ slug: 'post-1', title: 'Sam Post 1', author: 'sam' }),
	mockPost({ slug: 'post-2', title: 'Sam Post 2', author: 'sam' }),
	mockPost({ slug: 'post-3', title: 'AI Post 1', author: 'ai' }),
	mockPost({ slug: 'post-4', title: 'AI Post 2', author: 'ai' }),
	mockPost({ slug: 'post-5', title: 'Unknown Author Post', author: undefined }),
];

// Post 5 has no author, so it defaults to 'sam'

describe('filterPosts', () => {
	describe('author filtering', () => {
		test('when an author checkbox is checked, posts from that author are visible', () => {
			const authorFilters = { sam: true, ai: false };
			const result = filterPosts(basePosts, '', authorFilters);
			
			// Should include sam's posts (including post with no author = sam)
			expect(result).toHaveLength(3);
			expect(result.map(p => p.slug)).toContain('post-1');
			expect(result.map(p => p.slug)).toContain('post-2');
			expect(result.map(p => p.slug)).toContain('post-5');
		});

		test('when an author checkbox is unchecked, no posts from that author are visible', () => {
			const authorFilters = { sam: false, ai: true };
			const result = filterPosts(basePosts, '', authorFilters);
			
			expect(result).toHaveLength(2);
			expect(result.map(p => p.slug)).toContain('post-3');
			expect(result.map(p => p.slug)).toContain('post-4');
		});

		test('when all author checkboxes are unchecked, no posts are visible', () => {
			const authorFilters = { sam: false, ai: false };
			const result = filterPosts(basePosts, '', authorFilters);
			
			expect(result).toHaveLength(0);
		});

		test('when no author checkboxes are defined, all posts pass through', () => {
			const authorFilters = {};
			const result = filterPosts(basePosts, '', authorFilters);
			
			expect(result).toHaveLength(5);
		});

		test('posts with no author field are treated as sam', () => {
			const authorFilters = { sam: false, ai: true };
			const result = filterPosts(basePosts, '', authorFilters);
			
			// post-5 has no author (defaults to sam), so should be hidden when sam is unchecked
			expect(result).not.toContainEqual(expect.objectContaining({ slug: 'post-5' }));
		});
	});

	describe('combined tag and author filtering', () => {
		test('both tag and author filters are applied together', () => {
			const posts: Post[] = [
				mockPost({ slug: 'p1', title: 'Post 1', author: 'sam', tags: ['test'] }),
				mockPost({ slug: 'p2', title: 'Post 2', author: 'sam', tags: ['webdev'] }),
				mockPost({ slug: 'p3', title: 'Post 3', author: 'ai', tags: ['test'] }),
			];
			const authorFilters = { sam: true, ai: false };
			const result = filterPosts(posts, 'test', authorFilters);
			
			expect(result).toHaveLength(1);
			expect(result[0].slug).toBe('p1');
		});
	});
});
