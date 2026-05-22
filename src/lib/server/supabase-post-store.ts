import type { Post, PostStore } from './posts-store';

/**
 * Placeholder SupabasePostStore for Phase 1.
 * Throws an error if instantiated — prevents accidental use.
 * Will be replaced with the real implementation in Phase 2.
 */
export class SupabasePostStore implements PostStore {
	constructor() {
		throw new Error(
			'SupabasePostStore is not yet implemented. Set CONTENT_STORE=git or wait for Phase 2.'
		);
	}

	async listPosts(): Promise<Post[]> { throw new Error('Not implemented'); }
	async getPost(slug: string): Promise<Post | null> { throw new Error('Not implemented'); }
	async savePost(post: Omit<Post, 'date' | 'published'>): Promise<Post> { throw new Error('Not implemented'); }
	async updatePost(slug: string, updates: Partial<Pick<Post, 'title' | 'description' | 'content' | 'published'>>): Promise<Post> { throw new Error('Not implemented'); }
	async deletePost(slug: string): Promise<void> { throw new Error('Not implemented'); }
}
