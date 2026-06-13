import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { MediaEntry, MediaStore } from './media-store';
import { logger } from '$lib/logging';

const execAsync = promisify(exec);

/**
 * MediaStore implementation backed by the local filesystem + Git.
 * Used when CONTENT_STORE=git.
 */
export class FileSystemMediaStore implements MediaStore {
	private readonly basePath = path.resolve('media');

	private resolveBucketDir(bucket: 'images' | 'audio' | 'fonts'): string {
		return path.join(this.basePath, bucket);
	}

	/**
	 * Build the local path for a file within a bucket.
	 */
	private resolveFilePath(bucket: 'images' | 'audio' | 'fonts', filename: string): string {
		return path.join(this.resolveBucketDir(bucket), filename);
	}

	/**
	 * Build the public URL (relative path for the browser) for a file.
	 */
	private buildPublicUrl(bucket: 'images' | 'audio' | 'fonts', filename: string): string {
		return `/media/${bucket}/${filename}`;
	}

	/**
	 * Determine if a filename is a valid image extension.
	 */
	private isImageFile(filename: string): boolean {
		const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
		const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
		return IMAGE_EXTS.has(ext);
	}

	/**
	 * Detect MIME type from file extension.
	 */
	private detectMimeType(filename: string): string {
		const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
		const mimeMap: Record<string, string> = {
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			gif: 'image/gif',
			webp: 'image/webp',
			mp3: 'audio/mpeg',
			wav: 'audio/wav',
			mp4: 'video/mp4',
			webm: 'video/webm',
			woff2: 'font/woff2',
			woff: 'font/woff',
			ttf: 'font/ttf',
		};
		return mimeMap[ext] || 'application/octet-stream';
	}

	async listMedia(): Promise<MediaEntry[]> {
		const entries: MediaEntry[] = [];

		for (const bucket of ['images', 'audio', 'fonts'] as const) {
			const dir = this.resolveBucketDir(bucket);
			const stat = await fs.stat(dir).catch(() => null);
			if (!stat?.isDirectory()) continue;

			const files = await fs.readdir(dir);
			for (const file of files) {
				const fullPath = path.join(dir, file);
				const fileStat = await fs.stat(fullPath).catch(() => null);
				if (!fileStat?.isFile()) continue;

				// In git mode, only list images from the images bucket
				if (bucket === 'images') {
					if (!this.isImageFile(file)) continue;
				}

				entries.push({
					id: file,
					bucket,
					path: `media/${bucket}/${file}`,
					filename: file,
					mime_type: this.detectMimeType(file),
					size: fileStat.size,
					public_url: this.buildPublicUrl(bucket, file),
				});
			}
		}

		// Sort descending by filename
		entries.sort((a, b) => b.filename.localeCompare(a.filename));
		return entries;
	}

	async uploadMedia(
		file: File,
		bucket: 'images' | 'audio' | 'fonts',
	): Promise<MediaEntry> {
		// Sanitize filename
		const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
		const filePath = this.resolveFilePath(bucket, safeFilename);

		// Ensure bucket directory exists
		await fs.mkdir(this.resolveBucketDir(bucket), { recursive: true });

		// Write file to disk
		const buffer = Buffer.from(await file.arrayBuffer());
		await fs.writeFile(filePath, buffer);

		// Detect mime type
		const mimeType = this.detectMimeType(safeFilename);

		// Git add, commit, push
		const relativePath = `media/${bucket}/${safeFilename}`;
		await execAsync(`git add "${relativePath}"`);
		await execAsync(`git config user.name "Staging Admin" && git config user.email "admin@staging.local"`);

		let commitStdout = '';
		try {
			const result = await execAsync(`git commit --no-verify -m "media: add ${safeFilename}"`);
			commitStdout = result.stdout;
		} catch (e: any) {
			if (e.stdout?.includes('nothing to commit')) {
				commitStdout = e.stdout;
			} else {
				throw e;
			}
		}

		await execAsync('git push --no-verify origin main');

		logger.info(`Media upload (git): ${bucket}/${safeFilename} (${(file.size / 1024).toFixed(1)}KB)`);

		return {
			id: safeFilename,
			bucket,
			path: `media/${bucket}/${safeFilename}`,
			filename: safeFilename,
			mime_type: mimeType,
			size: file.size,
			public_url: this.buildPublicUrl(bucket, safeFilename),
		};
	}

	async deleteMedia(entry: MediaEntry): Promise<void> {
		const filePath = this.resolveFilePath(entry.bucket as 'images' | 'audio' | 'fonts', entry.filename);

		const stat = await fs.stat(filePath).catch(() => null);
		if (!stat?.isFile()) {
			throw new Error(`File not found: ${entry.filename}`);
		}

		await fs.unlink(filePath);
		logger.info(`Media delete (git): ${entry.filename}`);

		// Remove from git index
		await execAsync(`git config user.name "Staging Admin" && git config user.email "admin@staging.local"`);

		const relativePath = `media/${entry.bucket}/${entry.filename}`;
		await execAsync(`git rm --cached "${relativePath}"`);

		let commitStdout = '';
		try {
			const result = await execAsync(`git commit --no-verify -m "media: delete ${entry.filename}"`);
			commitStdout = result.stdout;
		} catch (e: any) {
			if (e.stdout?.includes('nothing to commit')) {
				commitStdout = e.stdout;
			} else {
				throw e;
			}
		}

		await execAsync('git push --no-verify origin main');
	}
}
