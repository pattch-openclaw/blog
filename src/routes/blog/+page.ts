export async function load({ fetch }) {
	const res = await fetch('/api/posts');
	const posts = await res.json();
	
	// Log author values for debugging
	const authorCounts: Record<string, number> = {};
	posts.forEach((post: any) => {
		const author = post.author || '(null)';
		authorCounts[author] = (authorCounts[author] || 0) + 1;
	});
	console.log(`/blog page — posts count: ${posts.length}, authors: ${JSON.stringify(authorCounts)}`);
	
	return { posts };
}