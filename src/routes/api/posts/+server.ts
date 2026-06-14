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
	
	// Log author values for debugging
	const authorCounts: Record<string, number> = {};
	allPosts.forEach((post) => {
		const author = post.author || '(null)';
		authorCounts[author] = (authorCounts[author] || 0) + 1;
	});
	logger.info(`/api/posts — authors: ${JSON.stringify(authorCounts)}`);
	
	const showDrafts = env.SHOW_DRAFTS === 'true';

	// Filter out unpublished posts unless we are in the staging environment
	const posts = showDrafts ? allPosts : allPosts.filter((post) => post.published);
	logger.info(`/api/posts — after filtering (showDrafts=${showDrafts}): ${posts.length} posts`);
	
	// Log author values after filtering for debugging
	const filteredAuthorCounts: Record<string, number> = {};
	posts.forEach((post) => {
		const author = post.author || '(null)';
		filteredAuthorCounts[author] = (filteredAuthorCounts[author] || 0) + 1;
	});
	logger.info(`/api/posts — filtered authors: ${JSON.stringify(filteredAuthorCounts)}`);

	return json(posts);
}