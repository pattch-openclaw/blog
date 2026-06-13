import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { GitPostStore } from '$lib/server/git-post-store';
import type { Post } from '$lib/types';
import { logger } from '$lib/logging';
import { replaceSupabaseUrls } from '$lib/server/supabase-url-resolver';
import fs from 'node:fs/promises';
import path from 'node:path';

// Lazy-load stores to avoid requiring Supabase env vars at module load time
async function getStores() {
	const { SupabaseMediaStore } = await import('$lib/server/supabase-media-store');
	const { SupabasePostStore } = await import('$lib/server/supabase-post-store');
	return {
		gitStore: new GitPostStore(),
		supabaseMediaStore: new SupabaseMediaStore(),
		supabasePostStore: new SupabasePostStore(),
	};
}

// Always use git as the source for migration — we read what exists on disk
// Stores are created lazily via getStores() to avoid env var requirements at module load.

/**
 * List all git-based posts for the migration selector.
 */
interface PostSummary {
	slug: string;
	title: string;
	date: string;
	description: string;
	published: boolean;
	author: string;
	tags: string[];
}

export const load: PageServerLoad = async () => {
	const stores = await getStores();
	const posts = await stores.gitStore.listPosts();
	// Return only metadata (exclude content for the list)
	const postList: PostSummary[] = posts.map((p) => ({
		slug: p.slug,
		title: p.title,
		date: p.date,
		description: p.description,
		published: p.published,
		author: p.author,
		tags: p.tags,
	}));
	return { posts: postList };
};

/**
 * Migrate a single git post (including its media) to Supabase.
 */
const migratePostToSupabase = async (slug: string): Promise<{ success: boolean; postSlug: string; mediaCount: number; errors: string[] }> => {
	const stores = await getStores();
	const errors: string[] = [];

	// 1. Read the post from git
	const gitPost = await stores.gitStore.getPost(slug);
	if (!gitPost) {
		throw new Error(`Post not found: ${slug}`);
	}

	// 2. Save the post to Supabase first to get its ID
	const supabasePost: Omit<Post, 'date' | 'published'> = {
		title: gitPost.title,
		slug: gitPost.slug,
		description: gitPost.description,
		content: gitPost.content,
		author: gitPost.author,
		tags: gitPost.tags,
	};

	let supabasePostWithId: Post;
	try {
		supabasePostWithId = await stores.supabasePostStore.savePost(supabasePost);
		logger.agent('migratePost', 'info', `Saved post to Supabase with ID: ${supabasePostWithId.id}`);
	} catch (e: any) {
		errors.push(`Failed to save post to Supabase: ${e.message}`);
		logger.error('migratePost', 'save failed', { slug, error: e.message });
		return {
			success: false,
			postSlug: slug,
			mediaCount: 0,
			errors,
		};
	}

	// 3. Find media referenced in the post content
	const mediaFiles = extractMediaPaths(supabasePostWithId.content);
	let mediaCount = 0;

	// 4. Build a map of old media paths to new Supabase public URLs
	const pathToUrl = new Map<string, string>();

	for (const mediaPath of mediaFiles) {
		const localFile = path.join(process.cwd(), mediaPath);
		const exists = await fs.stat(localFile).catch(() => null);

		if (!exists?.isFile()) {
			errors.push(`Media file not found on disk: ${mediaPath}`);
			continue;
		}

		// Determine bucket from path
		const bucket = determineBucket(mediaPath);
		if (!bucket) {
			errors.push(`Unknown bucket for media path: ${mediaPath}`);
			continue;
		}

		// Read file as buffer
		const buffer = await fs.readFile(localFile);

		// Create a File object for the MediaStore
		const file = new File([buffer], path.basename(mediaPath), { type: detectMimeType(mediaPath) });

		try {
			// Upload with the post ID so media entries are linked
			const entry = await stores.supabaseMediaStore.uploadMedia(file, bucket, supabasePostWithId.id);
			pathToUrl.set(mediaPath, entry.public_url);
			mediaCount++;
		} catch (e: any) {
			errors.push(`Failed to upload ${mediaPath}: ${e.message}`);
			logger.error('migrateMedia', 'upload failed', { mediaPath, error: e.message });
		}
	}

	// 5. Replace all media URLs in the post content from git paths to Supabase URLs
	let newContent = supabasePostWithId.content;
	for (const [oldPath, newUrl] of pathToUrl) {
		// The oldPath is like /media/images/filename.png
		// Replace it everywhere it appears in the content
		newContent = newContent.replaceAll(oldPath, newUrl);
	}

	// 5b. Replace Supabase public Storage URLs with signed URLs
	newContent = await replaceSupabaseUrls(newContent);

	// 6. Update the post with the modified content
	try {
		await stores.supabasePostStore.updatePost(supabasePostWithId.slug, { content: newContent });
	} catch (e: any) {
		errors.push(`Failed to update post with media URLs: ${e.message}`);
		logger.error('migratePost', 'update failed', { slug, error: e.message });
	}

	return {
		success: errors.length === 0,
		postSlug: supabasePostWithId.slug,
		mediaCount,
		errors,
	};
};

/**
 * Extract media image paths from markdown content.
 * Matches ![alt](/media/images/filename.ext) and similar patterns.
 */
function extractMediaPaths(content: string): string[] {
	const paths: string[] = [];
	// Match markdown image syntax: ![alt](/media/images/...)
	const regex = /!\[[^\]]*\]\((\/media\/images\/[^)]+)\)/g;
	let match;
	while ((match = regex.exec(content)) !== null) {
		const p = match[1];
		if (p && !paths.includes(p)) {
			paths.push(p);
		}
	}
	return paths;
}

/**
 * Determine which Supabase bucket a media path belongs to.
 */
function determineBucket(mediaPath: string): 'images' | 'audio' | 'fonts' | null {
	if (mediaPath.includes('/images/')) return 'images';
	if (mediaPath.includes('/audio/')) return 'audio';
	if (mediaPath.includes('/fonts/')) return 'fonts';
	return null;
}

/**
 * Detect MIME type from file extension.
 */
function detectMimeType(filename: string): string {
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

export const actions: Actions = {
	migrate: async ({ request }) => {
		const data = await request.formData();
		const slug = data.get('slug')?.toString();

		if (!slug) {
			return fail(400, { error: 'No post selected.' });
		}

		const result = await migratePostToSupabase(slug);

		return {
			success: result.success,
			postSlug: result.postSlug,
			mediaCount: result.mediaCount,
			errors: result.errors,
			directUrl: `/blog/${result.postSlug}`,
		};
	},
};
