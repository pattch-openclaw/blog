import { getPosts } from '$lib/server/posts';
import { env } from '$env/dynamic/private';

export async function load({ request }) {
	if (request.headers.get('x-mock-posts') === 'true') {
		return {
			recentPosts: [
				{ title: 'Mocked Recent Post 1', slug: 'mock-1', date: '2026-05-16', published: true },
				{ title: 'Mocked Recent Post 2', slug: 'mock-2', date: '2026-05-15', published: true },
				{ title: 'Mocked Recent Post 3', slug: 'mock-3', date: '2026-05-14', published: true }
			]
		};
	}

	const allPosts = await getPosts();
	const showDrafts = env.SHOW_DRAFTS === 'true';

	// Filter out unpublished posts unless we are in the staging environment
	const posts = showDrafts ? allPosts : allPosts.filter((post) => post.published);

	// Return top 3 recent posts
	return { 
		recentPosts: posts.slice(0, 3) 
	};
}