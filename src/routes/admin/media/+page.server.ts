import type { PageServerLoad, Actions } from './$types';
import { getMediaStore } from '$lib/server/media-store';
import { bucketRelPath, sanitizeMediaFolder } from '$lib/media-paths';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/logging';

export const load: PageServerLoad = async () => {
	const mediaStore = getMediaStore();
	const entries = await mediaStore.listMedia();

	// Lightweight listing only — no URL signing on page load. Thumbnails are
	// signed lazily per-folder via POST /admin/media/thumbs when a folder is expanded.
	const images = entries
		.filter(e => e.bucket === 'images')
		.map(e => ({
			id: e.id,
			name: e.filename,
			/** Path relative to the images bucket, e.g. 'trips/2026/x.png' */
			rel: bucketRelPath(e.path, 'images'),
			/** Storage path used for signing, e.g. 'images/trips/2026/x.png' */
			storage_path: e.path,
			path: e.public_url,
		}));

	const audio = entries
		.filter(e => e.bucket === 'audio')
		.map(e => ({
			name: e.filename,
			path: e.public_url,
			id: e.id,
			bucket: e.bucket,
		}));

	const fonts = entries
		.filter(e => e.bucket === 'fonts')
		.map(e => ({
			name: e.filename,
			path: e.public_url,
			id: e.id,
			bucket: e.bucket,
		}));

	return { images, audio, fonts };
};

export const actions: Actions = {
	upload: async ({ request }) => {
		const mediaStore = getMediaStore();
		const data = await request.formData();
		const type = data.get('type')?.toString();
		const folder = sanitizeMediaFolder(data.get('folder')?.toString() ?? '');
		const files = data.getAll('files').filter(
			(f): f is File => f instanceof File && f.size > 0
		);

		if (!type || !['images', 'audio', 'fonts'].includes(type)) {
			return fail(400, { error: 'Invalid media type', details: undefined, stdout: undefined, stderr: undefined });
		}

		if (files.length === 0) {
			return fail(400, { error: 'No files uploaded', details: undefined, stdout: undefined, stderr: undefined });
		}

		const bucket = type as 'images' | 'audio' | 'fonts';
		const uploaded: { path: string; filename: string; bucket: string; mimeType: string }[] = [];
		const failures: string[] = [];

		for (const file of files) {
			try {
				const entry = await mediaStore.uploadMedia(file, bucket, folder);

				logger.info(`Media upload successful: ${entry.filename} (${(entry.size / 1024).toFixed(1)}KB) to ${entry.bucket}`);

				uploaded.push({
					path: entry.public_url,
					filename: entry.filename,
					bucket: entry.bucket,
					mimeType: entry.mime_type
				});
			} catch (e: any) {
				logger.error(`Media upload failed for ${file.name}`, e);
				failures.push(`${file.name}: ${e.message || 'Upload failed'}`);
			}
		}

		if (uploaded.length === 0) {
			return fail(500, {
				error: files.length === 1 ? 'Upload failed' : 'All uploads failed',
				details: failures.join('\n'),
				stdout: undefined,
				stderr: undefined
			});
		}

		return {
			success: true,
			uploaded,
			failed: failures.length > 0 ? failures : undefined
		};
	},

	delete: async ({ request }) => {
		const mediaStore = getMediaStore();
		const data = await request.formData();
		const entryId = data.get('id')?.toString();

		if (!entryId) {
			return fail(400, { error: 'Missing entry ID', details: undefined, stdout: undefined, stderr: undefined });
		}

		// We need to reconstruct the MediaEntry since we only have the ID
		// For now, we'll list all entries and find the matching one
		// In the future, MediaStore could add a getEntry(id) method
		const entries = await mediaStore.listMedia();
		const entry = entries.find(e => e.id === entryId);

		if (!entry) {
			return fail(404, { error: 'Media entry not found', details: undefined, stdout: undefined, stderr: undefined });
		}

		try {
			await mediaStore.deleteMedia(entry);
			logger.info(`Media delete successful: ${entry.filename}`);
			return { success: true, deletedId: entryId };
		} catch (e: any) {
			logger.error('Media delete failed', e);
			return fail(500, {
				error: `Delete failed`,
				details: e.stack || e.message,
				stdout: undefined,
				stderr: undefined
			});
		}
	}
};
