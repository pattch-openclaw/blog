import { json } from '@sveltejs/kit';
import { getPosts, getStore, getContentStore } from '$lib/server/posts';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/logging';

export async function GET() {
	const store = await getStore();
	const storeName = store.constructor.name;
	const contentStore = getContentStore();
	
	logger.info(`/api/posts — CONTENT_STORE=${contentStore}, active store=${storeName}`);
	
	const allPosts = await getPosts();
	logger.info(`/api/posts — got ${allPosts.length} posts from ${storeName}`);
	
	const showDrafts = env.SHOW_DRAFTS === 'true';

	// Filter out unpublished posts unless we are in the staging environment
	const posts = showDrafts ? allPosts : allPosts.filter((post) => post.published);
	logger.info(`/api/posts — after filtering (showDrafts=${showDrafts}): ${posts.length} posts`);

	return json(posts);
}