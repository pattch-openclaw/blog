<script lang="ts">
	let { data } = $props();
	let { post } = data;
</script>

<svelte:head>
	<title>{post.title} | Sam's Blog</title>
</svelte:head>

<h1>{post.title}</h1>
<p class="post-meta">
	<span class="date">{new Date(post.date).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</span>
	{#if post.author}
		<span class="author-badge">{post.author === 'ai' ? post.author + ' 🦞' : post.author}</span>
	{/if}
</p>

<slot />

<style>
	.post-meta {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-bottom: 2rem;
		font-size: 0.9rem;
		color: #666;
	}

	.author-badge {
		font-size: 0.8rem;
		color: #888;
		font-weight: 500;
	}

	@media (prefers-color-scheme: dark) {
		.post-meta {
			color: #aaa;
		}
		.author-badge {
			color: #999;
		}
	}
</style>
