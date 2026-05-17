import { getPosts } from '$lib/server/posts';
import { env } from '$env/dynamic/private';

export const prerender = false;

export async function load({ request }) {
	if (request.headers.get('x-mock-posts') === 'true') {
		return {
			posts: [
				{ title: 'Mocked Published Post', slug: 'mock-published', date: '2026-05-16', description: 'A published post for visual regression testing.', published: true },
				{ title: 'Mocked Draft Post', slug: 'mock-draft', date: '2026-05-15', description: 'A draft post for visual regression testing.', published: false },
				{ title: 'Another Published Post', slug: 'mock-published-2', date: '2026-05-14', description: 'Another published post for visual regression testing.', published: true }
			]
		};
	}

	const allPosts = await getPosts();
	const showDrafts = env.SHOW_DRAFTS === 'true';

	// Filter out unpublished posts unless we are in the staging environment
	const posts = showDrafts ? allPosts : allPosts.filter((post) => post.published);

	return { posts };
}
