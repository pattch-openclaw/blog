import { fail } from '@sveltejs/kit';
import { getStore, getWriteStore, getContentStore } from '$lib/server/posts';

export const load = async () => {
	const store = await getStore();
	const posts = await store.listPosts();
	const isSupabase = getContentStore() === 'supabase';
	return { posts, isSupabase };
};

export const actions = {
	publish: async ({ request }) => {
		const data = await request.formData();
		const slug = data.get('slug')?.toString();

		if (!slug) {
			return fail(400, { error: 'Missing slug' });
		}

		const store = await getWriteStore();
		try {
			const post = await store.updatePost(slug, { published: true });
			
			setTimeout(() => {
				const { exec } = require('child_process');
				exec('git add "src/routes/blog/' + slug + '/+page.md"');
				exec('git commit --no-verify -m "content: publish ' + slug + '"');
				exec('git push --no-verify origin main', (err: any) => {
					if (err) console.error('Push failed:', err);
				});
			}, 1000);

			return { success: true, action: 'published' };
		} catch (e: any) {
			console.error(e);
			return fail(500, { error: `Failed to publish post: ${e.message}` });
		}
	},
	unpublish: async ({ request }) => {
		const data = await request.formData();
		const slug = data.get('slug')?.toString();

		if (!slug) {
			return fail(400, { error: 'Missing slug' });
		}

		const store = await getWriteStore();
		try {
			const post = await store.updatePost(slug, { published: false });
			
			setTimeout(() => {
				const { exec } = require('child_process');
				exec('git add "src/routes/blog/' + slug + '/+page.md"');
				exec('git commit --no-verify -m "content: unpublish ' + slug + '"');
				exec('git push --no-verify origin main', (err: any) => {
					if (err) console.error('Push failed:', err);
				});
			}, 1000);

			return { success: true, action: 'unpublished' };
		} catch (e: any) {
			console.error(e);
			return fail(500, { error: `Failed to unpublish post: ${e.message}` });
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

			return { success: true, action: 'deleted' };
		} catch (e: any) {
			console.error(e);
			return fail(500, { error: `Failed to delete post: ${e.message}` });
		}
	}
};
