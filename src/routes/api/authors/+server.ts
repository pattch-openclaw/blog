import { json } from '@sveltejs/kit';
import { getPosts } from '$lib/server/posts';

export async function GET() {
	const allPosts = await getPosts();

	// Compute unique authors sorted alphabetically, with post counts
	const authorCounts: Record<string, number> = {};
	allPosts.forEach((post) => {
		authorCounts[post.author] = (authorCounts[post.author] || 0) + 1;
	});

	const authors = Object.entries(authorCounts)
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([author, count]) => ({ author, count }));

	return json(authors);
}
