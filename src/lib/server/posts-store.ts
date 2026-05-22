import type { Post } from '$lib/types';

/**
 * Abstract interface for blog post storage providers.
 * 
 * Implementations swap out data sources (git filesystem, Supabase, SQLite, etc.)
 * without changing application logic. The content provider is selected via
 * the CONTENT_STORE env var at runtime.
 */
export interface PostStore {
	/**
	 * List all posts, sorted by date descending.
	 * Only returns post metadata (title, slug, description, date, published).
	 * Content is intentionally excluded from list results.
	 */
	listPosts(): Promise<Post[]>;

	/**
	 * Get a single post by slug, including full markdown content.
	 * Returns null if the post doesn't exist.
	 */
	getPost(slug: string): Promise<Post | null>;

	/**
	 * Create a new draft post. Sets published to false.
	 */
	savePost(post: Omit<Post, 'date' | 'published'>): Promise<Post>;

	/**
	 * Update an existing post (title, description, content, published).
	 * Does not change the slug.
	 */
	updatePost(slug: string, updates: Partial<Pick<Post, 'title' | 'description' | 'content' | 'published'>>): Promise<Post>;

	/**
	 * Delete a post by slug.
	 */
	deletePost(slug: string): Promise<void>;
}

/**
 * Configuration for selecting the active store provider.
 * Valid values: 'git', 'supabase'
 * Defaults to 'git' if unset or unrecognized.
 */
export function getContentStore(): 'git' | 'supabase' {
	const env = process.env.CONTENT_STORE?.toLowerCase().trim();
	if (env === 'supabase') return 'supabase';
	return 'git';
}
