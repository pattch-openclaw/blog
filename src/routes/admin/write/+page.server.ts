import { fail } from '@sveltejs/kit';
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
			
			await execAsync(`git add "src/routes/blog/${slug}/+page.md"`);
			await execAsync(`git commit -m "content: add draft for ${slug}"`);
			
			// Fire the push completely detached after a 1-second delay.
			// This gives the server enough time to successfully return the HTTP 200 response
			// to the client before the GitHub Action runner starts rebuilding and killing PM2.
			setTimeout(() => {
				exec('git push origin main', (err) => {
					if (err) console.error('Push failed:', err);
				});
			}, 1000);
			
		} catch (e: any) {
			console.error(e);
			return fail(500, { error: `Failed to save or commit file: ${e.message}` });
		}

		return { success: true, slug };
	}
};
