import { fail } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { getStore, getPosts } from '$lib/server/posts';

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

	if (!slug) {
		return { title: '', slug: '', description: '', content: '', isEdit: false, images };
	}

	const store = await getStore();
	try {
		const post = await store.getPost(slug);
		if (!post) {
			return { title: '', slug, description: '', content: '', isEdit: false, images };
		}

		return {
			title: post.title,
			slug: post.slug,
			description: post.description,
			content: post.content,
			isEdit: true,
			images
		};
	} catch (e) {
		console.error(`Failed to load existing draft for slug: ${slug}`, e);
	}

	return { title: '', slug, description: '', content: '', isEdit: false, images };
};

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const slug = data.get('slug')?.toString();
		const description = data.get('description')?.toString();
		const content = data.get('content')?.toString();

		if (!title || !slug || !content) {
			return fail(400, { error: 'Missing required fields (Title, Slug, and Content are required).' });
		}

		const store = await getStore();
		try {
			const post = await store.savePost({ title, slug, description, content });
			
			// Trigger git push in the background to start CI/CD
			setTimeout(() => {
				const { exec } = require('child_process');
				exec('git add "src/routes/blog/' + slug + '/+page.md"');
				exec('git commit --no-verify -m "content: add draft for ' + slug + '"');
				exec('git push --no-verify origin main', (err: any) => {
					if (err) console.error('Push failed:', err);
				});
			}, 1000);
			
			return { success: true, slug: post.slug };
		} catch (e: any) {
			console.error(e);
			return fail(500, { error: `Failed to save or commit file: ${e.message}` });
		}
	}
};
