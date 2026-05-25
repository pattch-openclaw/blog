<script lang="ts">
	import { marked } from 'marked';
	let { data } = $props();
	let { post } = data;
	let contentHtml = $derived(marked.parse(post.content || ''));
</script>

<svelte:head>
	<title>{post.title} | Sam's Blog</title>
</svelte:head>

<h1 class="post-title">{post.title}</h1>
<p class="post-meta">
	<span class="date">{new Date(post.date).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</span>
	{#if post.author}
		<span class="author-badge">{post.author === 'ai' ? post.author + ' 🦞' : post.author}</span>
	{/if}
</p>

<hr class="post-divider">

<div class="prose">{@html contentHtml}</div>

<style>
	.post-title {
		font-size: 2.5rem;
		font-weight: 700;
		margin-top: 0;
		margin-bottom: 0.5rem;
		line-height: 1.2;
	}

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

	.post-divider {
		border: none;
		border-top: 1px solid var(--border-color);
		margin: 2rem 0;
	}

	.prose {
		max-width: 100%;
	}

	.prose :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin-top: 2.5rem;
		color: var(--text-color);
	}

	.prose :global(h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: 2rem;
	}

	.prose :global(p) {
		font-size: 1.125rem;
		line-height: 1.7;
		margin-bottom: 1.25rem;
	}

	.prose :global(img) {
		max-width: 100%;
		border-radius: 6px;
	}

	.prose :global(pre) {
		margin: 1.5rem 0;
	}

	@media (prefers-color-scheme: dark) {
		.post-title {
			color: #f0f0f0;
		}
		.post-meta { color: #aaa; }
		.author-badge { color: #999; }
	}
</style>
