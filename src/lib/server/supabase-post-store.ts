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
 * In production it reads SUPABASE_URL and SUPABASE_ANON_KEY from environment.
 * Accept an optional `db` parameter for testing — pass a mock instead.
 */
export class SupabasePostStore implements PostStore {
	private readonly tableName = 'posts';
	private readonly db: SupabaseQueryClient;

	constructor(db?: SupabaseQueryClient) {
		if (db) {
			this.db = db;
		} else {
			// Production: use shared client factory
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
		const result = this.db
			.from(this.tableName)
			.select('id, title, slug, description, content, tags, published, created_at, updated_at')
			.order('created_at', { ascending: false });

		if (result.error) {
			throw new Error(`Failed to list posts from Supabase: ${result.error.message}`);
		}

		return (result.data ?? []).map((row: SupabasePostRow) => this.mapRow(row));
	}

	async getPost(slug: string): Promise<Post | null> {
		const result = this.db
			.from(this.tableName)
			.select('id, title, slug, description, content, tags, published, created_at, updated_at')
			.eq('slug', slug)
			.maybeSingle<SupabasePostRow>();

		if (result.error) {
			throw new Error(`Failed to get post "${slug}" from Supabase: ${result.error.message}`);
		}

		if (!result.data) return null;
		return this.mapRow(result.data as SupabasePostRow);
	}

	async savePost(post: Omit<Post, 'date' | 'published'>): Promise<Post> {
		const result = this.db
			.from(this.tableName)
			.insert({
				title: post.title,
				slug: post.slug,
				description: post.description,
				content: post.content,
				tags: post.tags,
				published: false,
			})
			.select();

		if (result.error) {
			throw new Error(`Failed to save post to Supabase: ${result.error.message}`);
		}

		if (!result.data || result.data.length === 0) {
			throw new Error('Supabase insert returned no data');
		}

		// .insert().select() returns an array of inserted rows;
		// take the first element instead of passing the whole array.
		const insertedRow = result.data[0] as SupabasePostRow;
		logger.info(`Supabase savePost inserted row: ${insertedRow.id} (slug: ${insertedRow.slug})`);
		return this.mapRow(insertedRow);
	}

	async updatePost(slug: string, updates: Partial<Pick<Post, 'title' | 'description' | 'content' | 'published' | 'author' | 'tags'>>): Promise<Post> {
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
			throw new Error(`Failed to update post "${slug}" in Supabase: ${result.error.message}`);
		}

		if (!result.data || result.data.length === 0) {
			throw new Error(`Supabase update returned no data for slug: ${slug}`);
		}

		return this.mapRow(result.data[0] as SupabasePostRow);
	}

	async deletePost(slug: string): Promise<void> {
		const { error } = await this.db
			.from(this.tableName)
			.delete()
			.eq('slug', slug)();

		if (error) {
			throw new Error(`Failed to delete post "${slug}" from Supabase: ${error.message}`);
		}
	}
}
