import { getContentStore } from './posts-store';
import type { PostStore } from './posts-store';

let _store: PostStore | null = null;

async function getStore(): Promise<PostStore> {
	if (_store) return _store;
	
	const provider = getContentStore();
	if (provider === 'supabase') {
		const { SupabasePostStore } = await import('./supabase-post-store');
		_store = new SupabasePostStore();
	} else {
		const { GitPostStore } = await import('./git-post-store');
		_store = new GitPostStore();
	}
	return _store;
}

export async function getPosts() {
	const store = await getStore();
	return store.listPosts();
}

export { getStore, getContentStore };
