import { fail } from '@sveltejs/kit';
import { getStore, getWriteStore } from '$lib/server/posts';
import { logger } from '$lib/logging';

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
		try {
			await store.deletePost(slug);
			logger.info(`Post deleted: ${slug}`);
			return { success: true, action: 'deleted' };
		} catch (e: any) {
			logger.error(`Delete failed for ${slug}: ${e.message}`);
			return fail(500, { error: `Failed to delete post: ${e.message}` });
		}
	}
};
