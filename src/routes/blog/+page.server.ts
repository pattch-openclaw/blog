import type { Post } from '$lib/types';

export async function load() {
	let posts: Post[] = [];

	const paths = import.meta.glob('/src/routes/blog/*/+page.md', { eager: true });

	for (const path in paths) {
		const file = paths[path];
		const slug = path.split('/').at(-2);

		if (file && typeof file === 'object' && 'metadata' in file && slug) {
			const metadata = file.metadata as Omit<Post, 'slug'>;
			
			// Only show published posts in the index (default to true if undefined)
			if (metadata.published !== false) {
				const post = { ...metadata, slug } satisfies Post;
				post.published = true;
				posts.push(post);
			}
		}
	}

	posts = posts.sort((first, second) =>
		new Date(second.date).getTime() - new Date(first.date).getTime()
	);

	return { posts };
}
