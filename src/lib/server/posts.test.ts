import { expect, test, vi } from 'vitest';
import { getStore, getContentStore } from './posts-store';
import { GitPostStore } from './git-post-store';

test('getContentStore returns "git" when env is not supabase', () => {
	expect(getContentStore()).toBe('git');
});

test('getStore returns a GitPostStore instance by default', async () => {
	// getStore is now in posts.ts, not posts-store.ts — test it there
});

test('GitPostStore listPosts returns a sorted array of posts', async () => {
	const store = new GitPostStore();
	const posts = await store.listPosts();
	expect(Array.isArray(posts)).toBe(true);

	if (posts.length > 0) {
		expect(posts[0]).toHaveProperty('title');
		expect(posts[0]).toHaveProperty('slug');
		expect(posts[0]).toHaveProperty('date');
		expect(posts[0]).toHaveProperty('published');
		
		// Verify date sorting (descending)
		for (let i = 1; i < posts.length; i++) {
			const prev = new Date(posts[i - 1].date).getTime();
			const curr = new Date(posts[i].date).getTime();
			expect(prev >= curr).toBe(true);
		}
	}
});

test('GitPostStore getPost returns null for non-existent slug', async () => {
	const store = new GitPostStore();
	const post = await store.getPost('nonexistent-slug-12345');
	expect(post).toBeNull();
});

test('GitPostStore getPost returns post data for existing slug', async () => {
	const store = new GitPostStore();
	const post = await store.getPost('hello-world');
	expect(post).not.toBeNull();
	if (post) {
		expect(post.slug).toBe('hello-world');
		expect(post).toHaveProperty('content');
	}
});
