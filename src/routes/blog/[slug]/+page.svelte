<script lang="ts">
	import { marked } from 'marked';
	
	let { data } = $props();
	let { post } = data;
	let isAdmin = data.isAdmin;
	let contentHtml = $derived(marked.parse(post.content || ''));
	
	async function handleDelete() {
		if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) {
			return;
		}
		const res = await fetch('/admin/write', {
			method: 'POST',
			body: new FormData(Object.assign(new FormData(), [['slug', post.slug], ['action', 'delete']])),
		});
		if (res.ok) {
			window.location.href = '/blog';
		} else {
			alert('Failed to delete post');
		}
	}
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

{#if isAdmin}
	<div class="admin-controls">
		<a href="/admin/write?slug={post.slug}" class="btn-edit">Edit</a>
		<button class="btn-delete" onclick={handleDelete}>Delete</button>
	</div>
{/if}

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

	.admin-controls {
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-color);
		display: flex;
		gap: 0.75rem;
	}

	.btn-edit {
		text-decoration: none;
		background: var(--text-color);
		color: var(--bg-color);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-delete {
		background: #dc3545;
		color: var(--bg-color);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-delete:hover {
		opacity: 0.9;
	}

	@media (prefers-color-scheme: dark) {
		.post-title {
			color: #f0f0f0;
		}
		.post-meta { color: #aaa; }
		.author-badge { color: #999; }
	}
</style>
