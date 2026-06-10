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
	const content = getContentStore() === 'supabase' ? await replaceSupabaseUrls(post.content || '') : post.content;

	logger.debug('blog.load', `getContentStore=${getContentStore()}, content replaced: ${content !== post.content}`);

	return { post: { ...post, content } };
}
