import type { Post, PostStore } from './posts-store';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase-client';
import { getMediaStore, SupabaseMediaStore } from './media-store';
import { logger } from '$lib/logging';

/**
 * Row shape returned from the Supabase `posts` table.
 */
interface SupabasePostRow {
	id: string;
	title: string;
	slug: string;
	description: string | null;
	content: string | null;
	tags: string[] | null;
	published: boolean | null;
	author: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Narrow surface type for the Supabase JS client query chain.
 * This lets us accept a mock in tests without depending on the full Supabase types.
 */
interface SupabaseQueryClient {
	from(table: string): {
		select<Columns>(cols?: string): {
			order<Col>(col: Col, opts: { ascending: boolean }): Promise<{
				data: SupabasePostRow[] | null;
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
					data: Row | null;
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
 * PostStore implementation that reads/writes blog posts from a Supabase Postgres database.
 *
 * Uses the anon/publishable key for all operations. RLS policies on the
 * posts table control read/write access. The security boundary is the
 * key itself — whoever has the key can read and write.
 *
 * Accept an optional `db` parameter for testing — pass a mock instead.
 */
export class SupabasePostStore implements PostStore {
	private readonly tableName = 'posts';
	private readonly db: SupabaseQueryClient;

	constructor(db?: SupabaseQueryClient) {
		if (db) {
			this.db = db;
		} else {
			this.db = getSupabaseClient() as unknown as SupabaseQueryClient;
		}
	}

	private mapRow(row: SupabasePostRow): Post {
		return {
			id: row.id,
			title: row.title ?? '',
			slug: row.slug ?? '',
			description: row.description ?? '',
			date: row.created_at ?? new Date().toISOString().split('T')[0],
			published: row.published ?? false,
			author: (row.author ?? 'sam').trim() || 'sam',
			tags: row.tags ?? [],
			content: row.content ?? '',
		};
	}

	async listPosts(): Promise<Post[]> {
		logger.agent('supabase.listPosts', 'info', 'Fetching posts from Supabase');
		
		const { data, error } = await this.db
			.from(this.tableName)
			.select('id, title, slug, description, content, tags, published, author, created_at, updated_at')
			.order('created_at', { ascending: false });

		if (error) {
			const msg = `Failed to list posts from Supabase: ${error.message}`;
			logger.agent('supabase.listPosts', 'error', msg);
			throw new Error(msg);
		}

		const count = (data ?? []).length;
		logger.agent('supabase.listPosts', 'info', `Returned ${count} posts`);
		
		// Log each row to confirm column shapes
		if (data) {
			for (const row of data as SupabasePostRow[]) {
				logger.agent('supabase.listPosts', 'info', `Row: id=${row.id}, slug=${row.slug}, published=${row.published}, author="${row.author}"`, { row });
			}
		}
		
		// Debug: also try raw query with '*' to see if column list matters
		const { data: rawResultData, error: rawResultError } = await this.db
			.from(this.tableName)
			.select('*')
			.order('created_at', { ascending: false });
		
		if (rawResultError) {
			logger.agent('supabase.listPosts', 'error', `Raw SELECT * error: ${rawResultError.message}`);
		}
		logger.agent('supabase.listPosts', 'info', `Raw SELECT * returned ${rawResultData ? (rawResultData as any[]).length : 'null'} rows, error=${rawResultError ? rawResultError.message : 'none'}`);

		return (data ?? []).map((row: SupabasePostRow) => this.mapRow(row));
	}

	async getPost(slug: string): Promise<Post | null> {
		logger.agent('supabase.getPost', 'info', `Fetching post: ${slug}`);
		
		const result = await this.db
			.from(this.tableName)
			.select('id, title, slug, description, content, tags, published, author, created_at, updated_at')
			.eq('slug', slug)
			.maybeSingle<SupabasePostRow>();

		if (result.error) {
			const msg = `Failed to get post "${slug}" from Supabase: ${result.error.message}`;
			logger.agent('supabase.getPost', 'error', msg, { slug });
			throw new Error(msg);
		}

		if (!result.data) {
			logger.agent('supabase.getPost', 'info', `Post not found: ${slug}`);
			return null;
		}
		logger.agent('supabase.getPost', 'info', `Found post: ${slug}`, { id: result.data.id });
		return this.mapRow(result.data as SupabasePostRow);
	}

	async savePost(post: Omit<Post, 'date' | 'published'>): Promise<Post> {
		const insertPayload = {
			title: post.title,
			slug: post.slug,
			description: post.description,
			content: post.content,
			tags: post.tags,
			published: false,
			author: post.author,
		};
		logger.agent('supabase.savePost', 'info', `Saving post: ${post.slug}`, { title: post.title });
		
		const result = await this.db
			.from(this.tableName)
			.insert(insertPayload)
			.select();

		if (result.error) {
			const msg = `Failed to save post to Supabase: ${result.error.message}`;
			logger.agent('supabase.savePost', 'error', msg, { slug: post.slug, error: result.error.message });
			throw new Error(msg);
		}

		logger.agent('supabase.savePost', 'info', `Insert returned data: ${result.data ? JSON.stringify(result.data) : 'null'}`);

		if (!result.data || result.data.length === 0) {
			logger.agent('supabase.savePost', 'error', 'Supabase insert returned no data (likely RLS block)', { slug: post.slug });
			throw new Error(
				`Supabase insert returned no data for post "${post.slug}". ` +
				'This usually means RLS is blocking the insert. Check the /admin/schema page for RLS policy status.'
			);
		}

		const insertedRow = result.data[0] as SupabasePostRow;
		logger.agent('supabase.savePost', 'info', `Inserted post: ${insertedRow.id} (slug: ${insertedRow.slug})`);
		// Link media entries to this post based on content
		await this.linkMediaToPost(insertedRow.id, insertPayload.content);
		
		return this.mapRow(insertedRow);
	}

	async updatePost(slug: string, updates: Partial<Pick<Post, 'title' | 'description' | 'content' | 'published' | 'author' | 'tags'>>): Promise<Post> {
		logger.agent('supabase.updatePost', 'info', `Updating post: ${slug}`, { updates: Object.keys(updates) });

		const dbUpdates: Record<string, unknown> = {
			...(updates.title !== undefined && { title: updates.title }),
			...(updates.description !== undefined && { description: updates.description }),
			...(updates.content !== undefined && { content: updates.content }),
			...(updates.published !== undefined && { published: updates.published }),
			...(updates.author !== undefined && { author: updates.author }),
			...(updates.tags !== undefined && { tags: updates.tags }),
		};

		const result = await this.db
			.from(this.tableName)
			.update(dbUpdates)
			.eq('slug', slug)
			.select();

		if (result.error) {
			const msg = `Failed to update post "${slug}" in Supabase: ${result.error.message}`;
			logger.agent('supabase.updatePost', 'error', msg, { slug });
			throw new Error(msg);
		}

		if (!result.data || result.data.length === 0) {
			logger.agent('supabase.updatePost', 'error', 'Supabase update returned no data (likely RLS block)', { slug });
			throw new Error(
				`Supabase update returned no data for slug: ${slug}. ` +
				'This usually means RLS is blocking the update. Check the /admin/schema page for RLS policy status.'
			);
		}

		logger.agent('supabase.updatePost', 'info', `Updated post: ${slug}`, { id: (result.data[0] as SupabasePostRow).id });
		
		// Link media entries to this post based on content (only if content changed)
		if (updates.content !== undefined) {
			await this.linkMediaToPost((result.data[0] as SupabasePostRow).id, updates.content);
		}
		return this.mapRow(result.data[0] as SupabasePostRow);
	}

	async deletePost(slug: string): Promise<void> {
		logger.agent('supabase.deletePost', 'info', `Deleting post: ${slug}`);

		// Get the post first to extract its ID
		const post = await this.getPost(slug);
		if (!post) {
			logger.agent('supabase.deletePost', 'warn', `Post not found: ${slug}`);
			return; // Already deleted
		}

		logger.agent('supabase.deletePost', 'info', `Post slug: ${post.slug}, title: ${post.title}`);

		// Delete the post
		const { error } = await this.db
			.from(this.tableName)
			.delete()
			.eq('slug', slug);

		if (error) {
			const msg = `Failed to delete post "${slug}" from Supabase: ${error.message}`;
			logger.agent('supabase.deletePost', 'error', msg, { slug });
			throw new Error(msg);
		}

		logger.agent('supabase.deletePost', 'info', `Deleted post: ${slug}`);
	}

	/**
	 * Extract media URLs from post content and link them to this post by updating post_id.
	 * Scans for patterns like /media/images/filename.png and /media/audio/filename.mp3
	 */
	private async linkMediaToPost(postId: string, content: string | null): Promise<void> {
		if (!content) return;
		
		logger.agent('linkMediaToPost', 'info', `Linking media entries for post: ${postId}`);
		
		// Extract media paths from content
		const mediaPaths: string[] = [];
		// Match patterns like /media/images/filename.ext, /media/audio/filename.ext, /media/fonts/filename.ext
		const regex = /\/media\/(images|audio|fonts)\/([^)\s]+)/g;
		let match;
		while ((match = regex.exec(content)) !== null) {
			const fullPath = `/media/${match[1]}/${match[2]}`;
			if (!mediaPaths.includes(fullPath)) {
				mediaPaths.push(fullPath);
			}
		}
		
		if (mediaPaths.length === 0) {
			logger.agent('linkMediaToPost', 'info', 'No media paths found in content');
			return;
		}
		
		logger.agent('linkMediaToPost', 'info', `Found ${mediaPaths.length} media paths: ${mediaPaths.join(', ')}`);
		
		// Use the Supabase client directly to bypass the narrow interface
		const supabase = this.db as any;
		
		for (const path of mediaPaths) {
			// Extract bucket and filename from path
			const parts = path.split('/');
			if (parts.length < 3) continue;
			
			const bucket = parts[1] as 'images' | 'audio' | 'fonts';
			const filename = parts[2];
			
			logger.agent('linkMediaToPost', 'info', `Looking up media entry: bucket=${bucket}, filename=${filename}`);
			
			// Find the media entry by bucket and filename
			const { data, error } = await supabase.from('media_entries')
				.select('id, path, filename, post_id')
				.eq('bucket', bucket)
				.eq('filename', filename);
			
			if (error) {
				logger.agent('linkMediaToPost', 'warn', `Failed to lookup media entry: ${error.message}`);
				continue;
			}
			
			if (!data || data.length === 0) {
				logger.agent('linkMediaToPost', 'info', `No media entry found for ${path}`);
				continue;
			}
			
			for (const entry of data) {
				logger.agent('linkMediaToPost', 'info', `Linking entry ${entry.id} to post ${postId} (was post_id=${entry.post_id})`);
				
				// Update post_id
				await supabase.from('media_entries')
					.update({ post_id: postId })
					.eq('id', entry.id);
			}
		}
		
		logger.agent('linkMediaToPost', 'info', `Completed linking media entries for post: ${postId}`);
	}
}
