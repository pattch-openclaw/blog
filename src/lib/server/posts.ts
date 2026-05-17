import type { Post } from '$lib/types';

export async function getPosts(): Promise<Post[]> {
	const posts: Post[] = [];
	const paths = import.meta.glob('/src/routes/blog/*/+page.md', { eager: true });

	for (const path in paths) {
		const file = paths[path];
		const slug = path.split('/').at(-2);

		if (file && typeof file === 'object' && 'metadata' in file && slug && !slug.startsWith('mock-')) {
			const metadata = file.metadata as Omit<Post, 'slug' | 'published'> & { published?: boolean };
			const post = {
				...metadata,
				slug,
				published: metadata.published !== false // Default to true if missing
			} satisfies Post;
			
			posts.push(post);
		}
	}

	return posts.sort((first, second) =>
		new Date(second.date).getTime() - new Date(first.date).getTime()
	);
}
