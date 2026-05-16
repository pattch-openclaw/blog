import { fail } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const actions = {
	publish: async ({ request }) => {
		const data = await request.formData();
		const slug = data.get('slug')?.toString();

		if (!slug) {
			return fail(400, { error: 'Missing slug' });
		}

		const filePath = path.join(process.cwd(), 'src', 'routes', 'blog', slug, '+page.md');

		try {
			let content = await fs.readFile(filePath, 'utf-8');
			content = content.replace(/published:\s*false/, 'published: true');
			await fs.writeFile(filePath, content, 'utf-8');
			
			await execAsync(`git add "src/routes/blog/${slug}/+page.md"`);
			await execAsync(`git commit --no-verify -m "content: publish ${slug}"`);
			
			setTimeout(() => {
				exec('git push --no-verify origin main', (err) => {
					if (err) console.error('Push failed:', err);
				});
			}, 1000);
		} catch (e: any) {
			console.error(e);
			return fail(500, { error: `Failed to publish post: ${e.message}` });
		}

		return { success: true, action: 'published' };
	},
	unpublish: async ({ request }) => {
		const data = await request.formData();
		const slug = data.get('slug')?.toString();

		if (!slug) {
			return fail(400, { error: 'Missing slug' });
		}

		const filePath = path.join(process.cwd(), 'src', 'routes', 'blog', slug, '+page.md');

		try {
			let content = await fs.readFile(filePath, 'utf-8');
			content = content.replace(/published:\s*true/, 'published: false');
			await fs.writeFile(filePath, content, 'utf-8');
			
			await execAsync(`git add "src/routes/blog/${slug}/+page.md"`);
			await execAsync(`git commit --no-verify -m "content: unpublish ${slug}"`);
			
			setTimeout(() => {
				exec('git push --no-verify origin main', (err) => {
					if (err) console.error('Push failed:', err);
				});
			}, 1000);
		} catch (e: any) {
			console.error(e);
			return fail(500, { error: `Failed to unpublish post: ${e.message}` });
		}

		return { success: true, action: 'unpublished' };
	}
};
