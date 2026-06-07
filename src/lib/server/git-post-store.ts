import fs from 'fs/promises';
import path from 'path';
import { logger } from '$lib/logging';
import type { Post, PostStore } from './posts-store';

/**
 * PostStore implementation that reads/writes blog posts from
 * the server's own git repository (src/routes/blog/<slug>/<slug>.md).
 * 
 * This is the existing behavior, refactored into a store class.
 */
export class GitPostStore implements PostStore {
	private readonly baseDir: string;

	constructor() {
		this.baseDir = path.resolve(process.cwd(), 'src', 'routes', 'blog');
	}

	async readPostFile(slugOrEntry: string): Promise<Post | null> {
		const postPath = path.join(this.baseDir, slugOrEntry, '+page.md');
		const postContentPath = path.join(this.baseDir, slugOrEntry, 'post.md');

		let fileData: string;
		try {
			fileData = await fs.readFile(postPath, 'utf-8');
		} catch {
			try {
				fileData = await fs.readFile(postContentPath, 'utf-8');
			} catch {
				return null;
			}
		}
		return this.parsePost(fileData, slugOrEntry);
	}

	async listPosts(): Promise<Post[]> {
		const posts: Post[] = [];
		const entries = await fs.readdir(this.baseDir, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const post = await this.readPostFile(entry.name);
			if (post) posts.push(post);
		}

		return posts.sort((a, b) =>
			new Date(b.date).getTime() - new Date(a.date).getTime()
		);
	}

	async getPost(slug: string): Promise<Post | null> {
		return this.readPostFile(slug);
	}

	async savePost(post: Omit<Post, 'date' | 'published'>): Promise<Post> {
		const { title, slug, description, content, author, tags } = post;
		const date = new Date().toISOString().split('T')[0];

		const tagsLine = tags && tags.length > 0
			? `tags: [${tags.map((t: string) => `'${t}'`).join(', ')}]`
			: '';

		const markdownContent = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
description: "${(description || '').replace(/"/g, '\\"')}"
published: false
author: ${author}
${tagsLine}
---

${content}
`;

		const postDir = path.join(this.baseDir, slug);
		const postFile = path.join(postDir, 'post.md');

		await fs.mkdir(postDir, { recursive: true });
		await fs.writeFile(postFile, markdownContent, 'utf-8');

		// Fire-and-forget git push so the running server picks up the change.
		setTimeout(async () => {
			const { exec } = await import('child_process');
			exec(
				`git add "src/routes/blog/${slug}/+page.md" && ` +
				`git commit --no-verify -m "content: add draft for ${slug}" && ` +
				`git push --no-verify origin main`,
				(err: any) => {
					if (err) {
						logger.agent('gitPostStore.savePost', 'warn', `Git sync failed for ${slug}`, { slug });
					} else {
						logger.agent('gitPostStore.savePost', 'info', `Git sync succeeded for ${slug}`, { slug });
					}
				}
			);
		}, 1000);

		return { title, slug, description, date, published: false, author, tags: tags || [], content };
	}

	async updatePost(slug: string, updates: Partial<Pick<Post, 'title' | 'description' | 'content' | 'published' | 'author' | 'tags'>>): Promise<Post> {
		const postPath = path.join(this.baseDir, slug, '+page.md');
		const postContentPath = path.join(this.baseDir, slug, 'post.md');
		let targetPath: string;
		let targetType: 'page' | 'content' = 'page';
		try {
			await fs.access(postContentPath);
			targetPath = postContentPath;
			targetType = 'content';
		} catch {
			targetPath = postPath;
			targetType = 'page';
		}
		const fileData = await fs.readFile(targetPath, 'utf-8');
		const match = fileData.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) throw new Error(`Post "${slug}" has no valid frontmatter`);

		let frontmatter = match[1];
		const body = match[2].replace(/^\n+/, '');

		if (updates.title !== undefined) {
			frontmatter = frontmatter.replace(
				/(title:\s*)(".*?"|[^@\n]+)/,
				`$1"${updates.title.replace(/"/g, '\\"')}"`
			);
		}
		if (updates.description !== undefined) {
			frontmatter = frontmatter.replace(
				/(description:\s*)(".*?"|[^@\n]+)/,
				`$1"${(updates.description || '').replace(/"/g, '\\"')}"`
			);
		}
		if (updates.published !== undefined) {
			frontmatter = frontmatter.replace(/published:\s*(true|false)/, `published: ${updates.published}`);
		}
		if (updates.author !== undefined) {
			if (frontmatter.includes('author:')) {
				frontmatter = frontmatter.replace(
					/(author:\s*)(".*?"|[^@\n]+)/,
					`$1${updates.author}`
				);
			} else {
				frontmatter = frontmatter.trim() + `\nauthor: ${updates.author}`;
			}
		}
		if (updates.tags !== undefined) {
			const tagsLine = updates.tags.length > 0
				? `tags: [${updates.tags.map((t: string) => `'${t}'`).join(', ')}]`
				: '';
			if (frontmatter.includes('tags:')) {
				frontmatter = frontmatter.replace(/tags:\s*\[[^\]]*\]/, tagsLine);
			} else if (tagsLine) {
				frontmatter = frontmatter.trim() + `\n${tagsLine}`;
			}
		}

		const newContent = `---\n${frontmatter}\n---\n${body}`;
		// Always write to post.md for consistency
		const writePath = path.join(this.baseDir, slug, 'post.md');
		await fs.mkdir(path.dirname(writePath), { recursive: true });
		await fs.writeFile(writePath, newContent, 'utf-8');

		return this.parsePost(newContent, slug)!;
	}

	async deletePost(slug: string): Promise<void> {
		const postDir = path.join(this.baseDir, slug);
		await fs.rm(postDir, { recursive: true, force: true });
	}

	private parsePost(fileData: string, slug: string): Post | null {
		const match = fileData.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) return null;

		const frontmatter = match[1];
		const content = match[2].replace(/^\n+/, '');

		const titleMatch = frontmatter.match(/title:\s*(?:"([^"]*)"|([^@\n]+))/);
		const dateMatch = frontmatter.match(/date:\s*(\S+)/);
		const descMatch = frontmatter.match(/description:\s*(?:"([^"]*)"|([^@\n]+))/);
		const publishedMatch = frontmatter.match(/published:\s*(true|false)/);

		const authorMatch = frontmatter.match(/author:\s*(?:"([^"]*)"|([^@\n]+))/);
		const tagsMatch = frontmatter.match(/tags:\s*\[([^\]]*)\]/);

		const title = titleMatch ? (titleMatch[1] ?? titleMatch[2])?.trim().replace(/\\"/g, '"') : '';
		const date = dateMatch?.[1] || new Date().toISOString().split('T')[0];
		const description = descMatch ? (descMatch[1] ?? descMatch[2])?.trim().replace(/\\"/g, '"') : '';
		const published = publishedMatch ? publishedMatch[1] === 'true' : true;
		const author = (authorMatch ? (authorMatch[1] ?? authorMatch[2])?.trim() : 'sam') || 'sam';
		const tags = tagsMatch
			? tagsMatch[1].split(',').map((t: string) => t.trim().replace(/^"|"$/g, '')).filter((t: string) => t)
			: [];

		return { title, slug, description, date, published, author, tags, content };
	}
}
