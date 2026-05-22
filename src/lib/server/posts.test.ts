import { expect, test, vi, describe } from 'vitest';
import { getStore, getContentStore, getPosts } from './posts';
import { GitPostStore } from './git-post-store';

test('getContentStore returns "git" when env is not supabase', () => {
	expect(getContentStore()).toBe('git');
});

test('getStore returns a GitPostStore instance by default', async () => {
	const store = await getStore();
	expect(store).toBeInstanceOf(GitPostStore);
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

describe('parsePost with unquoted frontmatter', () => {
	test('handles unquoted description', () => {
		const store = new GitPostStore();
		const fileData = `---
title: "Test Post"
date: 2026-01-01
description: An unquoted description here
published: true
---

Hello world
`;
		// @ts-expect-error accessing private method for testing
		const post = (store as any).parsePost(fileData, 'test');
		expect(post).not.toBeNull();
		expect(post?.title).toBe('Test Post');
		expect(post?.description).toBe('An unquoted description here');
		expect(post?.published).toBe(true);
	});

	test('handles unquoted title', () => {
		const store = new GitPostStore();
		const fileData = `---
title: No Quotes Here
date: 2026-01-01
description: "Quoted description"
published: true
---

Content
`;
		// @ts-expect-error accessing private method for testing
		const post = (store as any).parsePost(fileData, 'test');
		expect(post).not.toBeNull();
		expect(post?.title).toBe('No Quotes Here');
	});

	test('handles all unquoted fields', () => {
		const store = new GitPostStore();
		const fileData = `---
title: All Unquoted
date: 2026-01-01
description: No quotes anywhere
published: true
---

Body
`;
		// @ts-expect-error accessing private method for testing
		const post = (store as any).parsePost(fileData, 'test');
		expect(post).not.toBeNull();
		expect(post?.title).toBe('All Unquoted');
		expect(post?.description).toBe('No quotes anywhere');
	});

	test('handles quoted fields', () => {
		const store = new GitPostStore();
		const fileData = `---
title: "Quoted Title"
date: 2026-01-01
description: "Quoted description"
published: true
---

Body
`;
		// @ts-expect-error accessing private method for testing
		const post = (store as any).parsePost(fileData, 'test');
		expect(post).not.toBeNull();
		expect(post?.title).toBe('Quoted Title');
		expect(post?.description).toBe('Quoted description');
	});

	test('handles mixed quoted and unquoted fields', () => {
		const store = new GitPostStore();
		const fileData = `---
title: "Quoted Title"
date: 2026-01-01
description: No quotes on description
published: true
---

Body
`;
		// @ts-expect-error accessing private method for testing
		const post = (store as any).parsePost(fileData, 'test');
		expect(post).not.toBeNull();
		expect(post?.title).toBe('Quoted Title');
		expect(post?.description).toBe('No quotes on description');
	});

	test('parses unquoted published boolean', () => {
		const store = new GitPostStore();
		const fileData = `---
title: Test
date: 2026-01-01
description: Desc
published: false
---

Body
`;
		// @ts-expect-error accessing private method for testing
		const post = (store as any).parsePost(fileData, 'test');
		expect(post).not.toBeNull();
		expect(post?.published).toBe(false);
	});

	test('defaults to published: true when missing', () => {
		const store = new GitPostStore();
		const fileData = `---
title: Test
date: 2026-01-01
description: Desc
---

Body
`;
		// @ts-expect-error accessing private method for testing
		const post = (store as any).parsePost(fileData, 'test');
		expect(post).not.toBeNull();
		expect(post?.published).toBe(true);
	});
});
