import fs from 'fs/promises';
import path from 'path';
import type { Post, PostStore } from './posts-store';

/**
 * PostStore implementation that reads/writes blog posts from
 * the server's own git repository (src/routes/blog/<slug>/+page.md).
 * 
 * This is the existing behavior, refactored into a store class.
 */
export class GitPostStore implements PostStore {
	private readonly baseDir: string;

	constructor() {
		this.baseDir = path.resolve(process.cwd(), 'src', 'routes', 'blog');
	}

	async listPosts(): Promise<Post[]> {
		const posts: Post[] = [];
		const entries = await fs.readdir(this.baseDir, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const postPath = path.join(this.baseDir, entry.name, '+page.md');
			try {
				const fileData = await fs.readFile(postPath, 'utf-8');
				const post = this.parsePost(fileData, entry.name);
				if (post) posts.push(post);
			} catch {
				// Skip posts that can't be read
			}
		}

		return posts.sort((a, b) =>
			new Date(b.date).getTime() - new Date(a.date).getTime()
		);
	}

	async getPost(slug: string): Promise<Post | null> {
		const postPath = path.join(this.baseDir, slug, '+page.md');
		try {
			const fileData = await fs.readFile(postPath, 'utf-8');
			return this.parsePost(fileData, slug);
		} catch {
			return null;
		}
	}

	async savePost(post: Omit<Post, 'date' | 'published'>): Promise<Post> {
		const { title, slug, description, content } = post;
		const date = new Date().toISOString().split('T')[0];

		const markdownContent = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
description: "${(description || '').replace(/"/g, '\\"')}"
published: false
---

${content}
`;

		const postDir = path.join(this.baseDir, slug);
		const postFile = path.join(postDir, '+page.md');

		await fs.mkdir(postDir, { recursive: true });
		await fs.writeFile(postFile, markdownContent, 'utf-8');

		return { title, slug, description, date, published: false, content };
	}

	async updatePost(slug: string, updates: Partial<Pick<Post, 'title' | 'description' | 'content' | 'published'>>): Promise<Post> {
		const postPath = path.join(this.baseDir, slug, '+page.md');
		const fileData = await fs.readFile(postPath, 'utf-8');
		const match = fileData.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) throw new Error(`Post "${slug}" has no valid frontmatter`);

		let frontmatter = match[1];
		const body = match[2].replace(/^\n+/, '');

		if (updates.title !== undefined) {
			// Match both quoted and unquoted title
			frontmatter = frontmatter.replace(
				/(title:\s*)(".*?"|[^@\n]+)/,
				`$1"${updates.title.replace(/"/g, '\\"')}"`
			);
		}
		if (updates.description !== undefined) {
			// Match both quoted and unquoted description
			frontmatter = frontmatter.replace(
				/(description:\s*)(".*?"|[^@\n]+)/,
				`$1"${(updates.description || '').replace(/"/g, '\\"')}"`
			);
		}
		if (updates.published !== undefined) {
			frontmatter = frontmatter.replace(/published:\s*(true|false)/, `published: ${updates.published}`);
		}

		const newContent = `---\n${frontmatter}\n---\n${body}`;
		await fs.writeFile(postPath, newContent, 'utf-8');

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

		const title = titleMatch ? (titleMatch[1] ?? titleMatch[2])?.trim().replace(/\\"/g, '"') : '';
		const date = dateMatch?.[1] || new Date().toISOString().split('T')[0];
		const description = descMatch ? (descMatch[1] ?? descMatch[2])?.trim().replace(/\\"/g, '"') : '';
		const published = publishedMatch ? publishedMatch[1] === 'true' : true;

		return { title, slug, description, date, published, content };
	}
}
