import { error } from '@sveltejs/kit';
import { getStore, getContentStore } from '$lib/server/posts';
import { replaceSupabaseUrls } from '$lib/server/supabase-url-resolver';
import { logger } from '$lib/logging';

export async function load({ params }) {
	const store = await getStore();
	const post = await store.getPost(params.slug);

	if (!post) {
		error(404, 'Not found');
	}

	// For Supabase-hosted posts, replace public Storage URLs with signed URLs
	const originalContent = post.content || '';
	const contentStore = getContentStore();
	
	logger.debug('blog.load', `Processing post ${params.slug}, contentStore=${contentStore}`);
	logger.debug('blog.load', `Content length: ${originalContent.length} characters`);
	
	const hasSupabaseUrl = originalContent.includes('storage/v1/object/public');
	logger.debug('blog.load', `Has Supabase URL in content: ${hasSupabaseUrl}`);
	
	const content = contentStore === 'supabase' ? await replaceSupabaseUrls(originalContent) : originalContent;
	
	logger.debug('blog.load', `Content replaced: ${content !== originalContent}`);

	return { post: { ...post, content } };
}
