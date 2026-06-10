import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase-client';
import type { MediaEntry, MediaStore } from './media-store';
import { logger } from '$lib/logging';
import path from 'node:path';

/**
 * Row shape returned from the Supabase `media_entries` table.
 */
interface MediaEntryRow {
	id: string;
	bucket: string;
	path: string;
	filename: string;
	mime_type: string;
	size: number;
	post_id: string | null;
	uploaded_at: string;
}

/**
 * Narrow surface type for the Supabase JS client query chain.
 * This lets us accept a mock in tests without depending on the full Supabase types.
 */
interface SupabaseQueryClient {
	from(table: string): {
		select<Columns>(cols?: string): {
			order<Col>(col: Col, opts: { ascending: boolean }): Promise<{
				data: MediaEntryRow[] | null;
				error: { message: string } | null;
			}>;
			maybeSingle<Row>(): Promise<{
				data: Row | null;
				error: { message: string } | null;
			}>;
			eq<Col>(col: Col, value: unknown): {
				maybeSingle<Row>(): Promise<{
					data: Row | null;
					error: { message: string } | null;
				}>;
				select<Row>(): Promise<{
					data: Row[] | null;
					error: { message: string } | null;
				}>;
			};
		};
		insert(record: Record<string, unknown>): {
			select<Row>(): Promise<{
				data: Row[] | null;
				error: { message: string } | null;
			}>;
		};
		update(record: Record<string, unknown>): {
			eq<Col>(col: Col, value: unknown): {
				select<Row>(): Promise<{
					data: Row[] | null;
					error: { message: string } | null;
				}>;
			};
		};
		delete(): {
			eq<Col>(col: Col, value: unknown): Promise<{
				error: { message: string } | null;
			}>;
		};
	};
}

/**
 * MediaStore implementation backed by Supabase Storage + Postgres.
 *
 * Uses the anon key for all operations. RLS policies on the
 * `media_entries` table and Supabase Storage buckets control access.
 */
export class SupabaseMediaStore implements MediaStore {
	private readonly mediaTable = 'media_entries';

	private readonly buckets = ['images', 'audio', 'fonts'] as const;

	private readonly db: SupabaseQueryClient;
	private readonly storage: SupabaseClient['storage'];

	constructor(storageClient?: SupabaseClient) {
		const client = storageClient ?? getSupabaseClient();
		this.db = client as unknown as SupabaseQueryClient;
		this.storage = client.storage;
	}

	/**
	 * Build the public URL for a media entry.
	 *
	 * Supabase Storage public URLs follow this pattern:
	 * https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
	 */
	private buildPublicUrl(bucket: string, path: string): string {
		const url = process.env.SUPABASE_URL;
		if (!url) {
			// Fallback: construct from project name in URL
			return `https://supabase.io/storage/v1/object/public/${bucket}/${path}`;
		}
		return `${url}/storage/v1/object/public/${bucket}/${path}`;
	}

	/**
	 * Generate a signed (time-limited) URL for a storage object.
	 * Uses the service key to avoid RLS restrictions.
	 */
	async getSignedUrl(bucket: string, path: string, seconds = 3600): Promise<string> {
		const { createClient } = await import('@supabase/supabase-js');
		const serviceUrl = process.env.SUPABASE_URL;
		const serviceKey = process.env.SUPABASE_SERVICE_KEY;

		if (!serviceUrl || !serviceKey) {
			logger.warn('supabase.getSignedUrl', 'missing service key, falling back to public URL');
			return this.buildPublicUrl(bucket, path);
		}

		// Use service key (bypasses RLS)
		const serviceClient = createClient(serviceUrl, serviceKey);
		const { data, error } = await serviceClient.storage
			.from(bucket)
			.createSignedUrl(path, seconds);

		if (error) {
			logger.warn('supabase.getSignedUrl', `Failed to create signed URL for ${bucket}/${path}: ${error.message}`);
			return this.buildPublicUrl(bucket, path);
		}

		return data.signedUrl;
	}

	/**
	 * Build a map of public URLs → signed URLs for all Supabase-hosted media paths in the given content.
	 */
	private async resolveMediaUrls(content: string, pathToUrl: Map<string, string>, seconds = 3600): Promise<string> {
		let newContent = content;

		for (const [oldPath, publicUrl] of pathToUrl) {
			if (!publicUrl.startsWith(process.env.SUPABASE_URL ?? '')) continue;

			try {
				const signedUrl = await this.getSignedUrl('images', path.basename(publicUrl), seconds);
				newContent = newContent.replaceAll(publicUrl, signedUrl);
			} catch {
				// Keep the public URL as fallback
			}
		}

		return newContent;
	}

	/**
	 * Detect MIME type from file extension.
	 */
	private detectMimeType(filename: string): string {
		const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
		const mimeMap: Record<string, string> = {
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			gif: 'image/gif',
			webp: 'image/webp',
			mp3: 'audio/mpeg',
			wav: 'audio/wav',
			mp4: 'video/mp4',
			webm: 'video/webm',
			woff2: 'font/woff2',
			woff: 'font/woff',
			ttf: 'font/ttf',
		};
		return mimeMap[ext] || 'application/octet-stream';
	}

	/**
	 * Validate that a bucket name is supported.
	 */
	private validateBucket(bucket: string): void {
		if (!this.buckets.includes(bucket as any)) {
			throw new Error(`Unsupported bucket: ${bucket}. Must be one of: ${this.buckets.join(', ')}`);
		}
	}

	/**
	 * List all media entries from the `media_entries` table.
	 */
	async listMedia(): Promise<MediaEntry[]> {
		logger.agent('supabase.listMedia', 'info', 'Fetching media entries from Supabase');

		const { data, error } = await this.db
			.from(this.mediaTable)
			.select('id, bucket, path, filename, mime_type, size, post_id, uploaded_at')
			.order('uploaded_at', { ascending: false });

		if (error) {
			const msg = `Failed to list media from Supabase: ${error.message}`;
			logger.agent('supabase.listMedia', 'error', msg);
			throw new Error(msg);
		}

		if (!data) {
			logger.agent('supabase.listMedia', 'warn', 'No media entries returned');
			return [];
		}

		const entries: MediaEntry[] = data.map((row: MediaEntryRow) => ({
			id: row.id,
			bucket: row.bucket,
			path: row.path,
			filename: row.filename,
			mime_type: row.mime_type,
			size: row.size,
			post_id: row.post_id,
			public_url: this.buildPublicUrl(row.bucket, row.path),
		}));

		logger.agent('supabase.listMedia', 'info', `Returned ${entries.length} media entries`);
		return entries;
	}

	/**
	 * Upload a file to Supabase Storage and register a row in `media_entries`.
	 */
	async uploadMedia(
		file: File,
		bucket: 'images' | 'audio' | 'fonts',
		postId?: string,
	): Promise<MediaEntry> {
		this.validateBucket(bucket);

		// Sanitize filename to prevent path traversal
		const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
		const filePath = `${bucket}/${safeFilename}`;

		logger.agent('supabase.uploadMedia', 'info', `Uploading ${bucket}/${safeFilename} (${file.size} bytes)`);

		// Upload to Supabase Storage
		const uploadDataResult = await this.storage
			.from(bucket)
			.upload(filePath, file, { upsert: true });

		if (uploadDataResult.error) {
			const msg = `Failed to upload ${safeFilename} to Supabase Storage: ${uploadDataResult.error.message}`;
			logger.agent('supabase.uploadMedia', 'error', msg);
			throw new Error(msg);
		}

		if (!uploadDataResult.data || (uploadDataResult.data as unknown as any[]).length === 0) {
			throw new Error(`Supabase Storage upload returned no data for ${safeFilename}`);
		}

		const mimeType = this.detectMimeType(safeFilename);

		// Insert metadata row into media_entries table
		const { data: insertData, error: insertError } = await this.db
			.from(this.mediaTable)
			.insert({
				bucket,
				path: filePath,
				filename: safeFilename,
				mime_type: mimeType,
				size: file.size,
				post_id: postId || null,
			})
			.select();

		if (insertError) {
			const msg = `Failed to insert media_entries row for ${safeFilename}: ${insertError.message}`;
			logger.agent('supabase.uploadMedia', 'error', msg);
			throw new Error(msg);
		}

		if (!insertData || insertData.length === 0) {
			throw new Error(`Supabase insert returned no data for media_entries: ${safeFilename}`);
		}

		const insertedRow = insertData[0] as MediaEntryRow;

		logger.agent('supabase.uploadMedia', 'info', `Successfully uploaded ${safeFilename} (id: ${insertedRow.id})`);

		return {
			id: insertedRow.id,
			bucket: insertedRow.bucket,
			path: insertedRow.path,
			filename: insertedRow.filename,
			mime_type: insertedRow.mime_type,
			size: insertedRow.size,
			post_id: insertedRow.post_id,
			public_url: this.buildPublicUrl(insertedRow.bucket, insertedRow.path),
		};
	}

	/**
	 * Delete a media entry from Supabase Storage and remove the row from `media_entries`.
	 */
	async deleteMedia(entry: MediaEntry): Promise<void> {
		const bucket = entry.bucket as 'images' | 'audio' | 'fonts';
		this.validateBucket(bucket);

		const filePath = entry.path.startsWith(bucket) ? entry.path : `${bucket}/${entry.filename}`;

		logger.agent('supabase.deleteMedia', 'info', `Deleting ${bucket}/${entry.filename}`);

		// Delete from Supabase Storage
		const { error: storageError } = await this.storage
			.from(bucket)
			.remove([filePath]);

		if (storageError) {
			logger.agent('supabase.deleteMedia', 'error', `Storage delete error: ${storageError.message}`);
			// Still attempt to delete the DB row to maintain consistency
		}

		// Delete the row from media_entries
		const { error } = await this.db
			.from(this.mediaTable)
			.delete()
			.eq('id', entry.id);

		if (error) {
			const msg = `Failed to delete media_entries row ${entry.id}: ${error.message}`;
			logger.agent('supabase.deleteMedia', 'error', msg);
			throw new Error(msg);
		}

		logger.agent('supabase.deleteMedia', 'info', `Deleted media entry: ${entry.filename} (id: ${entry.id})`);
	}
}
