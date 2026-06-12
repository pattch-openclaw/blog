import { getContentStore } from './posts-store';
import type { PostStore } from './posts-store';
import { getMediaStore } from './media-store';

let _store: PostStore | null = null;

async function getStore(): Promise<PostStore> {
	if (_store) return _store;
	
	const provider = getContentStore();
	if (provider === 'supabase') {
		const { SupabasePostStore } = await import('./supabase-post-store');
		_store = new SupabasePostStore();
	} else if (provider === 'test-mock') {
		const { TestMockPostStore } = await import('./test-mock-store');
		_store = new TestMockPostStore();
	} else {
		const { GitPostStore } = await import('./git-post-store');
		_store = new GitPostStore();
	}
	return _store;
}

/**
 * Get a write-capable store. Since all operations use the same anon key,
 * this is the same as getStore — RLS policies on the posts table control access.
 */
async function getWriteStore(): Promise<PostStore> {
	return getStore();
}

export async function getPosts() {
	const store = await getStore();
	return store.listPosts();
}

export async function getAllTags(): Promise<string[]> {
	const store = await getStore();
	const posts = await store.listPosts();
	const tagSet = new Set<string>();
	posts.forEach((post) => {
		post.tags.forEach((tag) => tagSet.add(tag.toLowerCase()));
	});
	return Array.from(tagSet).sort();
}

export { getStore, getWriteStore, getContentStore, getMediaStore };
