import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMediaStore } from '$lib/server/media-store';

/** Cap per request; folders are expected to be far below this. */
const MAX_PATHS = 500;

/**
 * Lazy thumbnail signing for the admin media folder tree.
 * POST { paths: string[] } with storage paths (MediaEntry.path shape,
 * e.g. 'images/trips/x.png') -> { urls: Record<path, previewUrl> }.
 */
export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const paths = (body as { paths?: unknown })?.paths;
	if (!Array.isArray(paths) || paths.some((p) => typeof p !== 'string')) {
		return json({ error: 'paths must be an array of strings' }, { status: 400 });
	}
	if (paths.length === 0) {
		return json({ urls: {} });
	}
	if (paths.length > MAX_PATHS) {
		return json({ error: `Too many paths (max ${MAX_PATHS})` }, { status: 400 });
	}

	const mediaStore = getMediaStore();
	const previews = await mediaStore.previewUrls(paths as string[]);

	const urls: Record<string, string> = {};
	previews.forEach((url, path) => {
		urls[path] = url;
	});

	return json({ urls });
};
