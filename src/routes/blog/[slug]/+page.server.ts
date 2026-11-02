import { error } from '@sveltejs/kit';
import { getStore, getContentStore } from '$lib/server/posts';
import { rewriteToImageKit } from '$lib/server/imagekit';
import { logger } from '$lib/logging';

export async function load({ params }) {
	const store = await getStore();
	const post = await store.getPost(params.slug);

	if (!post) {
		error(404, 'Not found');
	}

	// Serve Supabase-hosted images through the ImageKit CDN (public bucket).
	// No-op when IMAGEKIT_URL is unset; git-store /media paths pass through.
	const originalContent = post.content || '';
	const contentStore = getContentStore();
	
	logger.debug('blog.load', `Processing post ${params.slug}, contentStore=${contentStore}`);
	logger.debug('blog.load', `Content length: ${originalContent.length} characters`);
	
	const hasSupabaseUrl = originalContent.includes('storage/v1/object/public');
	logger.debug('blog.load', `Has Supabase URL in content: ${hasSupabaseUrl}`);
	
	const content = rewriteToImageKit(originalContent);
	
	logger.debug('blog.load', `Content replaced: ${content !== originalContent}`);

	return { post: { ...post, content } };
}
