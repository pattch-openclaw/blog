import { json } from '@sveltejs/kit';
import { getPosts } from '$lib/server/posts';
import { env } from '$env/dynamic/private';

export async function GET() {
	const allPosts = await getPosts();
	const showDrafts = env.SHOW_DRAFTS === 'true';

	// Filter out unpublished posts unless we are in the staging environment
	const posts = showDrafts ? allPosts : allPosts.filter((post) => post.published);

	return json(posts);
}