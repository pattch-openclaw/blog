export async function load({ fetch }) {
	const res = await fetch('/api/posts');
	const posts = await res.json();
	return { recentPosts: posts.slice(0, 3) };
}