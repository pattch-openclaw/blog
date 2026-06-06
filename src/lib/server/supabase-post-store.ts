import type { Post, PostStore } from './posts-store';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase-client';
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
	created_at: string;
	updated_at: string;
}

/**
 * Narrow surface type for the Supabase JS client query chain.
 * This lets us accept a mock in tests without depending on the full Supabase types.
 */
interface SupabaseQueryClient {
	from(table: string): {
		// select().order() for list queries
		select<Columns>(cols?: string): {
			order<Col>(col: Col, opts: { ascending: boolean }): {
				data: SupabasePostRow[] | null;
				error: { message: string } | null;
			};
			// select().eq().maybeSingle() for get queries
			maybeSingle<Row>(): {
				data: Row | null;
				error: { message: string } | null;
			};
			// select().eq() returns this same object so maybeSingle() can follow
			eq<Col>(col: Col, value: unknown): {
				maybeSingle<Row>(): {
					data: Row | null;
					error: { message: string } | null;
				};
				select<Row>(): {
					data: Row | null;
					error: { message: string } | null;
				};
			};
		};
		insert(record: Record<string, unknown>): {
			select<Row>(): {
				data: Row | null;
				error: { message: string } | null;
			};
		};
		update(record: Record<string, unknown>): {
			eq<Col>(col: Col, value: unknown): {
				select<Row>(): {
					data: Row | null;
					error: { message: string } | null;
				};
			};
		};
		delete(): {
			eq<Col>(col: Col, value: unknown): {
				(): Promise<{ error: { message: string } | null }>;
			};
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
			title: row.title ?? '',
			slug: row.slug ?? '',
			description: row.description ?? '',
			date: row.created_at ?? new Date().toISOString().split('T')[0],
			published: row.published ?? false,
			author: 'sam',
			tags: row.tags ?? [],
			content: row.content ?? '',
		};
	}

	async listPosts(): Promise<Post[]> {
		logger.agent('supabase.listPosts', 'info', 'Fetching posts from Supabase');
		
		const result = this.db
			.from(this.tableName)
			.select('id, title, slug, description, content, tags, published, created_at, updated_at')
			.order('created_at', { ascending: false });

		// Debug: also try raw query with '*' to see if column list matters
		const rawResult = this.db
			.from(this.tableName)
			.select('*')
			.order('created_at', { ascending: false });
		
		if (rawResult.error) {
			logger.agent('supabase.listPosts', 'error', `Raw SELECT * error: ${rawResult.error.message}`);
		}
		logger.agent('supabase.listPosts', 'info', `Raw SELECT * returned ${rawResult.data ? (rawResult.data as any[]).length : 'null'} rows, error=${rawResult.error ? rawResult.error.message : 'none'}`);

		if (result.error) {
			const msg = `Failed to list posts from Supabase: ${result.error.message}`;
			logger.agent('supabase.listPosts', 'error', msg);
			throw new Error(msg);
		}

		const count = (result.data ?? []).length;
		logger.agent('supabase.listPosts', 'info', `Returned ${count} posts`);
		
		// Debug: log the full raw response to see what Supabase actually returned
		const rawResponse = JSON.stringify(result);
		logger.agent('supabase.listPosts', 'info', `Full response: ${rawResponse}`);
		return (result.data ?? []).map((row: SupabasePostRow) => this.mapRow(row));
	}

	async getPost(slug: string): Promise<Post | null> {
		logger.agent('supabase.getPost', 'info', `Fetching post: ${slug}`);
		
		const result = this.db
			.from(this.tableName)
			.select('id, title, slug, description, content, tags, published, created_at, updated_at')
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
		};
		logger.agent('supabase.savePost', 'info', `Saving post: ${post.slug}`, { title: post.title });
		
		const result = this.db
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
		return this.mapRow(insertedRow);
	}

	async updatePost(slug: string, updates: Partial<Pick<Post, 'title' | 'description' | 'content' | 'published' | 'author' | 'tags'>>): Promise<Post> {
		logger.agent('supabase.updatePost', 'info', `Updating post: ${slug}`, { updates: Object.keys(updates) });

		const dbUpdates: Record<string, unknown> = {
			...(updates.title !== undefined && { title: updates.title }),
			...(updates.description !== undefined && { description: updates.description }),
			...(updates.content !== undefined && { content: updates.content }),
			...(updates.published !== undefined && { published: updates.published }),
			...(updates.tags !== undefined && { tags: updates.tags }),
		};

		const result = this.db
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
		return this.mapRow(result.data[0] as SupabasePostRow);
	}

	async deletePost(slug: string): Promise<void> {
		logger.agent('supabase.deletePost', 'info', `Deleting post: ${slug}`);

		const { error } = await this.db
			.from(this.tableName)
			.delete()
			.eq('slug', slug)();

		if (error) {
			const msg = `Failed to delete post "${slug}" from Supabase: ${error.message}`;
			logger.agent('supabase.deletePost', 'error', msg, { slug });
			throw new Error(msg);
		}

		logger.agent('supabase.deletePost', 'info', `Deleted post: ${slug}`);
	}
}
