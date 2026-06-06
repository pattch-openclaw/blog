import type { Post } from '$lib/types';

// Re-export Post so consumers can import from posts-store
export type { Post };

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
	 * Handles any necessary post-save side effects internally (e.g., git sync).
	 * The caller does not need to know about or trigger any post-save operations.
	 * Returns the saved Post object.
	 */
	savePost(post: Omit<Post, 'date' | 'published'>): Promise<Post>;

	/**
	 * Update an existing post (title, description, content, published, author, tags).
	 * Does not change the slug.
	 */
	updatePost(slug: string, updates: Partial<Pick<Post, 'title' | 'description' | 'content' | 'published' | 'author' | 'tags'>>): Promise<Post>;

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
export function getContentStore(): 'git' | 'supabase' | 'test-mock' {
	const env = process.env.CONTENT_STORE?.toLowerCase().trim();
	if (env === 'supabase') return 'supabase';
	if (env === 'test-mock') return 'test-mock';
	return 'git';
}
