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

import { SupabaseMediaStore } from './supabase-media-store.js';
import { FileSystemMediaStore } from './file-media-store.js';

/**
 * Configuration for selecting the active media store provider.
 * Valid values: 'git', 'supabase'
 * Defaults to 'git' if unset or unrecognized.
 */
export function getMediaStore(): MediaStore {
	const env = process.env.CONTENT_STORE?.toLowerCase().trim();
	if (env === 'supabase') {
		return new SupabaseMediaStore();
	}
	// Default to filesystem store for git mode
	return new FileSystemMediaStore();
}
