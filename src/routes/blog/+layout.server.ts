import { getPosts } from '$lib/server/posts';
import { getContentStore } from '$lib/server/posts';
import { env } from '$env/dynamic/private';

export async function load({ url }) {
	const showAdminControls = env.SHOW_DRAFTS === 'true';
	let isDraft = false;
	let currentSlug = '';

	if (url.pathname.startsWith('/blog/') && url.pathname !== '/blog') {
		const slug = url.pathname.split('/')[2];
		if (slug) {
			currentSlug = slug;
			const posts = await getPosts();
			const post = posts.find((p) => p.slug === slug);
			if (post && !post.published) {
				isDraft = true;
			}
		}
	}

	return { showAdminControls, isDraft, currentSlug, isSupabase: getContentStore() === 'supabase' };
}
