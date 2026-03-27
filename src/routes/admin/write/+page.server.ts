import { fail, redirect } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

		// Calculate today's date
		const date = new Date().toISOString().split('T')[0];
		
		// Build the frontmatter block
		const markdownContent = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
description: "${(description || '').replace(/"/g, '\\"')}"
published: false
---

${content}
`;

		// Determine the absolute path to the blog directory inside the source code
		const dir = path.join(process.cwd(), 'src', 'routes', 'blog', slug);
		const filePath = path.join(dir, '+page.md');

		try {
			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(filePath, markdownContent, 'utf-8');
			
			// Because SvelteKit routes are statically compiled at build time,
			// writing a new file won't magically make it a route on a running Node server.
			// Instead, we commit it to Git and push, which triggers our self-hosted runner to rebuild and restart PM2!
			
			// Commit and push the new draft
			await execAsync(`git add "src/routes/blog/${slug}/+page.md"`);
			await execAsync(`git commit -m "content: add draft for ${slug}"`);
			await execAsync('git push origin main');
		} catch (e: any) {
			console.error(e);
			return fail(500, { error: `Failed to save or push file: ${e.message}` });
		}

		// Redirect to a success page that tells the user the CI is rebuilding
		throw redirect(303, `/admin/success?slug=${slug}`);
	}
};
