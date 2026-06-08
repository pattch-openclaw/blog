import { error } from '@sveltejs/kit';
import { getStore } from '$lib/server/posts';
import { env } from '$env/dynamic/private';

export async function load({ params }) {
	const store = await getStore();
	const post = await store.getPost(params.slug);

	if (!post) {
		error(404, 'Not found');
	}

	const isAdmin = env.SHOW_DRAFTS === 'true';

	return { post, isAdmin };
}
