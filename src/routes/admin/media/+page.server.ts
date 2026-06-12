import type { PageServerLoad, Actions } from './$types';
import { getMediaStore } from '$lib/server/media-store';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/logging';

export const load: PageServerLoad = async () => {
	const mediaStore = getMediaStore();
	const entries = await mediaStore.listMedia();
	
	// Group by bucket for the UI
	const images = entries
		.filter(e => e.bucket === 'images')
		.map(e => ({
			name: e.filename,
			path: e.public_url,
			id: e.id,
			bucket: e.bucket,
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
		const file = data.get('file') as File;

		if (!type || !['images', 'audio', 'fonts'].includes(type)) {
			return fail(400, { error: 'Invalid media type' });
		}

		if (!file || file.size === 0) {
			return fail(400, { error: 'No file uploaded' });
		}

		try {
			const entry = await mediaStore.uploadMedia(file, type as 'images' | 'audio' | 'fonts', undefined);
			
			logger.info(`Media upload successful: ${entry.filename} (${(entry.size / 1024).toFixed(1)}KB) to ${entry.bucket}`);
			
			return { 
				success: true, 
				path: entry.public_url,
				filename: entry.filename,
				bucket: entry.bucket,
				mimeType: entry.mime_type
			};
		} catch (e: any) {
			logger.error('Media upload failed', e);
			return fail(500, { 
				error: `Upload failed`,
				details: e.stack || e.message
			});
		}
	},

	delete: async ({ request }) => {
		const mediaStore = getMediaStore();
		const data = await request.formData();
		const entryId = data.get('id')?.toString();

		if (!entryId) {
			return fail(400, { error: 'Missing entry ID' });
		}

		// We need to reconstruct the MediaEntry since we only have the ID
		// For now, we'll list all entries and find the matching one
		// In the future, MediaStore could add a getEntry(id) method
		const entries = await mediaStore.listMedia();
		const entry = entries.find(e => e.id === entryId);

		if (!entry) {
			return fail(404, { error: 'Media entry not found' });
		}

		try {
			await mediaStore.deleteMedia(entry);
			logger.info(`Media delete successful: ${entry.filename}`);
			return { success: true, deletedId: entryId };
		} catch (e: any) {
			logger.error('Media delete failed', e);
			return fail(500, { 
				error: `Delete failed`,
				details: e.stack || e.message
			});
		}
	}
};
