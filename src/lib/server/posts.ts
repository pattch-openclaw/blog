import { getContentStore } from './posts-store';
import type { PostStore } from './posts-store';

let _store: PostStore | null = null;
let _storeServiceKey: PostStore | null = null;

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
 * Get a write-capable store. For Supabase, this uses the service-role key (bypasses RLS).
 * For other stores, falls back to the regular store.
 */
async function getWriteStore(): Promise<PostStore> {
	if (_storeServiceKey) return _storeServiceKey;
	
	const provider = getContentStore();
	if (provider === 'supabase') {
		const { SupabasePostStore } = await import('./supabase-post-store');
		_storeServiceKey = new SupabasePostStore(undefined, true);
	} else {
		// For git/test-mock, write/store are the same
		_storeServiceKey = await getStore();
	}
	return _storeServiceKey;
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

export { getStore, getWriteStore, getContentStore };
