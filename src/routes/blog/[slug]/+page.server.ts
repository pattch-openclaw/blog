import { error } from '@sveltejs/kit';
import { getStore } from '$lib/server/posts';

export async function load({ params }) {
	const store = await getStore();
	const post = await store.getPost(params.slug);

	if (!post) {
		error(404, 'Not found');
	}

	return { post };
}
