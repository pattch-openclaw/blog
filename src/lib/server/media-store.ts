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

// -----------------------------------------
// MediaStore abstraction
// -----------------------------------------

/**
 * A single media entry (image, audio, font, etc.) stored via any MediaStore
 * implementation.
 */
export interface MediaEntry {
	/** Unique identifier (filesystem path for git mode, UUID for supabase mode) */
	id: string;
	/** Bucket type: 'images' | 'audio' | 'fonts' */
	bucket: string;
	/** Storage-specific path (e.g. 'images/filename.png' or 'media/images/filename.png') */
	path: string;
	/** Original filename */
	filename: string;
	/** MIME type of the file */
	mime_type: string;
	/** File size in bytes */
	size: number;
	/** Post ID this entry is linked to, or null if unlinked */
	post_id: string | null;
	/** Public/download URL for this entry (resolved by the implementation) */
	public_url: string;
}

/**
 * Abstract interface for blog media storage providers.
 * 
 * Implementations swap out data sources (git filesystem, Supabase Storage, etc.)
 * without changing application logic. The active provider is selected via
 * the CONTENT_STORE env var at runtime.
 */
export interface MediaStore {
	/**
	 * List all media entries.
	 */
	listMedia(): Promise<MediaEntry[]>;

	/**
	 * Upload a file to the media store.
	 * Handles any necessary post-save side effects internally.
	 */
	uploadMedia(file: File, bucket: 'images' | 'audio' | 'fonts', postId?: string): Promise<MediaEntry>;

	/**
	 * Delete a media entry by its MediaEntry reference.
	 */
	deleteMedia(entry: MediaEntry): Promise<void>;
}

/**
 * Configuration for selecting the active media store provider.
 * Valid values: 'git', 'supabase'
 * Defaults to 'git' if unset or unrecognized.
 */
export function getMediaStore(): MediaStore {
	const env = process.env.CONTENT_STORE?.toLowerCase().trim();
	if (env === 'supabase') {
		throw new Error('SupabaseMediaStore not yet implemented');
	}
	// Default to filesystem store for git mode
	const { FileSystemMediaStore } = require('./file-media-store.ts');
	return new FileSystemMediaStore();
}
