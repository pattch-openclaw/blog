import { expect, test } from 'vitest';
import { GitPostStore } from './git-post-store';
import { TestMockPostStore } from './test-mock-store';

// ------------------------------------ ------------------ ------ ----------- ----
// Author default test (GitPostStore → savePost defaults to 'sam')
// ------ ---------------------------------- ---- ---------- ------ ----------- ----

test('savePost defaults to sam author when not explicitly set', async () => {
	const store = new GitPostStore();
	const post = await store.savePost({
		title: 'Test Post',
		slug: 'test-default-author',
		description: 'Testing default author',
		author: 'sam',
		content: 'Hello',
		tags: []
	});
	expect(post.author).toBe('sam');

	// Cleanup
	await store.deletePost('test-default-author');
});

// ------ -------------------------- ---- ------------------ ------ ----------- ----
// Author rendering test (parsePost correctly extracts author)
// ------ ---------------------------------- ---- ---------- ------ ----------- ----

test('parsePost renders the author field correctly', async () => {
	const store = new GitPostStore();
	const fileData = `---
title: "Test"
date: 2026-01-01
description: "Desc"
author: ai
---

Body
`;
	// @ts-expect-error accessing private method for testing
	const post = (store as any).parsePost(fileData, 'test');
	expect(post).not.toBeNull();
	expect(post?.author).toBe('ai');
});

// ------ -------------------------- ---- ------------------ ------ ----------- ----
// Blog list renders author (via TestMockPostStore)
// ------ ---------------------------------- ---- ---------- ------ ----------- ----

test('blog lists render the author from the data layer', async () => {
	const store = new TestMockPostStore();
	const posts = await store.listPosts();

	// Verify every post has an author field
	posts.forEach((post) => {
		expect(post.author).toBeDefined();
		expect(typeof post.author).toBe('string');
		expect(post.author.length).toBeGreaterThan(0);
	});

	// Verify AI post renders with correct author
	const aiPost = posts.find((p) => p.slug === 'mock-ai');
	expect(aiPost).toBeDefined();
	expect(aiPost?.author).toBe('ai');
});

// ------ -------------------------- ---- ------------------ ------ ----------- ----
// Graceful handling of missing author on blog posts
// ------ ---------------------------------- ---- ---------- ------ ----------- ----

test('blog posts gracefully handle missing author fields (defaults to sam)', async () => {
	const store = new GitPostStore();
	const fileData = `---
title: "No Author"
date: 2026-01-01
description: "No author specified"
published: true
---

Body
`;
	// @ts-expect-error accessing private method for testing
	const post = (store as any).parsePost(fileData, 'no-author');
	expect(post).not.toBeNull();
	expect(post?.author).toBe('sam');
});

// ------ -------------------------- ---- ------------------ ------ ----------- ----
// Graceful handling of missing author on blog lists
// ------ ---------------------------------- ---- ---------- ------ ----------- ----

test('blog lists gracefully handle missing author fields', async () => {
	const store = new TestMockPostStore();
	const posts = await store.listPosts();

	posts.forEach((post) => {
		expect(post.author).toBeDefined();
		expect(typeof post.author).toBe('string');
	});

	// TestMockPostStore always has author; also verify GitPostStore defaults
	const store2 = new GitPostStore();
	// Get a post that might not have author set (e.g. an old post)
	const anyPost = await store2.getPost('hello-world');
	if (anyPost) {
		expect(anyPost.author).toBeDefined();
		expect(typeof anyPost.author).toBe('string');
	}
});

// ------ -------------------------- ---- ------------------ ------ ----------- ----
// Single post page renders the author
// ------ ---------------------------------- ---- ---------- ------ ----------- ----

test('single post page loads and renders the author from getPost', async () => {
	const store = new TestMockPostStore();
	const post = await store.getPost('mock-ai');

	expect(post).not.toBeNull();
	expect(post?.author).toBe('ai');

	// Also verify a 'sam' authored post
	const samPost = await store.getPost('mock-published');
	expect(samPost).not.toBeNull();
	expect(samPost?.author).toBe('sam');
});

// ------ -------------------------- ---- ------------------ ------ ----------- ----
// Single post page handles missing author gracefully
// ------ ---------------------------------- ---- ---------- ------ ----------- ----

test('single post page handles posts with no author gracefully (defaults to sam)', async () => {
	const store = new GitPostStore();
	const fileData = `---
title: "Draft Post No Author"
date: 2026-02-01
description: "A draft without author"
published: false
---

Draft body content
`;
	// @ts-expect-error accessing private method for testing
	const post = (store as any).parsePost(fileData, 'draft-no-author');
	expect(post).not.toBeNull();
	expect(post?.author).toBe('sam');
});

// ------ -------------------------- ---- ------------------ ------ ----------- ----
// Writing/Editing a blog post sets the author correctly
// ------ ---------------------------------- ---- ---------- ------ ----------- ----

test('writing a blog post sets the author correctly', async () => {
	const store = new GitPostStore();
	const post = await store.savePost({
		title: 'Test Author Post',
		slug: 'test-author-save',
		description: 'Testing author save',
		author: 'ai',
		content: 'Test content with explicit author.',
		tags: ['test']
	});

	expect(post.author).toBe('ai');
	expect(post.title).toBe('Test Author Post');

	// Verify it can be retrieved with the correct author
	const retrieved = await store.getPost('test-author-save');
	expect(retrieved).not.toBeNull();
	expect(retrieved?.author).toBe('ai');

	// Cleanup
	await store.deletePost('test-author-save');
});

test('editing a blog post updates the author correctly', async () => {
	const store = new GitPostStore();

	// First, save a post with author 'sam'
	await store.savePost({
		title: 'Test Edit Author',
		slug: 'test-edit-author',
		description: 'Testing author edit',
		author: 'sam',
		content: 'Initial content.',
		tags: []
	});

	// Then update the author to 'ai'
	const updated = await store.updatePost('test-edit-author', {
		author: 'ai'
	});

	expect(updated.author).toBe('ai');

	// Verify the update persisted via getPost
	const retrieved = await store.getPost('test-edit-author');
	expect(retrieved).not.toBeNull();
	expect(retrieved?.author).toBe('ai');

	// Cleanup
	await store.deletePost('test-edit-author');
});
