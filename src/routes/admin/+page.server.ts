import { fail } from '@sveltejs/kit';
import { getStore } from '$lib/server/posts';

export const actions = {
	publish: async ({ request }) => {
		const data = await request.formData();
		const slug = data.get('slug')?.toString();

		if (!slug) {
			return fail(400, { error: 'Missing slug' });
		}

		const store = await getStore();
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

		const store = await getStore();
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
	}
};
