import { getPosts } from '$lib/server/posts';
import { env } from '$env/dynamic/private';

export async function load() {
	const allPosts = await getPosts();
	const showDrafts = env.SHOW_DRAFTS === 'true';

	// Filter out unpublished posts unless we are in the staging environment
	const posts = showDrafts ? allPosts : allPosts.filter((post) => post.published);

	return { posts };
}
