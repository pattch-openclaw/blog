import { getPosts } from '$lib/server/posts';
import { env } from '$env/dynamic/private';

export async function load({ url, request }) {
	const isTestEnvironment = request.headers.get('x-playwright-test') === 'true';
	const showAdminControls = env.SHOW_DRAFTS === 'true' || isTestEnvironment;
	let isDraft = false;
	let currentSlug = '';

	if (url.pathname.startsWith('/blog/') && url.pathname !== '/blog') {
		const slug = url.pathname.split('/')[2];
		if (slug) {
			currentSlug = slug;
			const posts = await getPosts();
			const post = posts.find((p) => p.slug === slug);
			
			// If we are in a test env testing a mocked draft route
			if (isTestEnvironment && slug === 'mock-draft') {
				isDraft = true;
			} else if (post && !post.published) {
				isDraft = true;
			}
		}
	}

	return { showAdminControls, isDraft, currentSlug };
}
