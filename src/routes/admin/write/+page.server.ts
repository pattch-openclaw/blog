import { fail } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { getStore, getWriteStore, getPosts, getAllTags, getContentStore } from '$lib/server/posts';
import { logger } from '$lib/logging';

export const load = async ({ url }) => {
	const slug = url.searchParams.get('slug');

	let images: string[] = [];
	try {
		const mediaPath = path.join(process.cwd(), 'media', 'images');
		const files = await fs.readdir(mediaPath);
		images = files.filter(f => !f.startsWith('.'));
	} catch (e) {
		console.error('Failed to load images for picker', e);
	}

	const allTags = await getAllTags();

	if (!slug) {
		return { title: '', slug: '', description: '', content: '', isEdit: false, images, tags: [], author: 'sam', allTags };
	}

	const store = await getStore();
	try {
		const post = await store.getPost(slug);
		if (!post) {
			return { title: '', slug, description: '', content: '', isEdit: false, images, tags: [], author: 'sam', allTags };
		}

		return {
			title: post.title,
			slug: post.slug,
			description: post.description,
			content: post.content,
			tags: post.tags,
			author: post.author,
			isEdit: true,
			images
		};
	} catch (e) {
		console.error(`Failed to load existing draft for slug: ${slug}`, e);
	}

	return { title: '', slug, description: '', content: '', isEdit: false, images, tags: [], author: 'sam', allTags };
};

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const slug = data.get('slug')?.toString();
		const description = data.get('description')?.toString();
		const content = data.get('content')?.toString();
		const authorRaw = data.get('author')?.toString();
		const customAuthor = data.get('customAuthor')?.toString();
		const tagsRaw = data.get('tags')?.toString();

		// Resolve author
		let author = 'sam';
		if (authorRaw === '__custom__' && customAuthor?.trim()) {
			author = customAuthor.trim();
		} else if (authorRaw && ['sam', 'ai'].includes(authorRaw)) {
			author = authorRaw;
		}

		// Parse tags
		let tags: string[] = [];
		if (tagsRaw?.trim()) {
			tags = tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean);
		}

		if (!title || !slug || !content) {
			return fail(400, { error: 'Missing required fields (Title, Slug, and Content are required).' });
		}

		const store = await getWriteStore();
		try {
			// Check if this is an existing post (edit mode)
			const existing = await store.getPost(slug);
			let savedPost;

			if (existing) {
				logger.info(`Updating existing post: ${slug} (author: ${author})`);
				savedPost = await store.updatePost(slug, { title, description, content, author, tags });
				logger.info(`Post updated successfully: ${slug}`);
			} else {
				logger.info(`Saving new post: ${slug} (author: ${author})`);
				savedPost = await store.savePost({ title, slug, description, content, author, tags });
				logger.info(`Post saved successfully: ${slug}`);
			}
			
			const isSupabase = getContentStore() === 'supabase';
			return { success: true, slug: savedPost.slug, isSupabase };
		} catch (e: any) {
			logger.error(`Failed to save post ${slug}:`, e);
			return fail(500, { error: `Failed to save or commit file: ${e.message}` });
		}
	},
	delete: async ({ request }) => {
		const data = await request.formData();
		const slug = data.get('slug')?.toString();

		if (!slug) {
			return fail(400, { error: 'Missing slug' });
		}

		const store = await getWriteStore();
		const isSupabase = getContentStore() === 'supabase';

		try {
			await store.deletePost(slug);

			// For git-based stores, also remove the file and push
			if (!isSupabase) {
				const { exec } = require('child_process');
				exec('git rm -r "src/routes/blog/' + slug + '" 2>/dev/null || true');
				exec('git commit --no-verify -m "content: delete ' + slug + '"');
				exec('git push --no-verify origin main', (err: any) => {
					if (err) console.error('Push failed:', err);
				});
			}

			return { success: true, slug, action: 'deleted' };
		} catch (e: any) {
			console.error(e);
			return fail(500, { error: `Failed to delete post: ${e.message}` });
		}
	}
};
