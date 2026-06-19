import { fail } from '@sveltejs/kit';
import { getStore, getWriteStore, getPosts, getAllTags, getContentStore, getMediaStore } from '$lib/server/posts';
import { replaceSupabaseUrls } from '$lib/server/supabase-url-resolver';
import { logger } from '$lib/logging';

export const load = async ({ url }) => {
	const slug = url.searchParams.get('slug');

	// Get images from MediaStore (works for both git and supabase)
	let images: Array<{ filename: string; public_url: string; preview_url?: string }> = [];
	try {
		const mediaStore = getMediaStore();
		const mediaEntries = await mediaStore.listMedia();
		const imageEntries = mediaEntries.filter(e => e.bucket === 'images');
		
		images = await Promise.all(
			imageEntries.map(async e => ({ 
				filename: e.filename, 
				public_url: e.public_url,
				preview_url: await replaceSupabaseUrls(e.public_url)
			}))
		);
		images.sort((a, b) => a.filename.localeCompare(b.filename));
	} catch (e) {
		logger.error('Failed to load images for picker', e);
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
		logger.error(`Failed to load existing draft for slug: ${slug}`, e);
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
	}
};
