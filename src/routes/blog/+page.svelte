<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Writing | Sam's Blog</title>
</svelte:head>

<h1>Writing</h1>
<p>A collection of my thoughts and experiments.</p>

<ul class="posts">
	{#each data.posts as post}
		<li class:is-draft={!post.published}>
			<div class="post-meta">
				<span class="date">{new Date(post.date).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</span>
				{#if !post.published}
					<span class="draft-badge">📝 Draft</span>
				{/if}
			</div>
			<a class="title" href="/blog/{post.slug}">{post.title}</a>
			{#if post.description}
				<p class="description">{post.description}</p>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.posts {
		list-style: none;
		padding: 0;
		margin-top: 2rem;
	}

	.posts li {
		margin-bottom: 2rem;
		display: flex;
		flex-direction: column;
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.posts li.is-draft {
		background-color: #fffbeb;
		border: 1px dashed #fcd34d;
		padding: 1.25rem;
		font-family: "Courier New", Courier, ui-monospace, SFMono-Regular, monospace;
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.draft-badge {
		font-size: 0.7rem;
		background-color: #fbbf24;
		color: #000;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-weight: 700;
		text-transform: uppercase;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	}

	.date {
		font-size: 0.875rem;
		color: #666;
	}

	.title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-color);
		line-height: 1.2;
		margin-bottom: 0.5rem;
	}

	.title:hover {
		color: var(--link-color);
	}

	.description {
		margin: 0;
		color: #555;
	}

	@media (prefers-color-scheme: dark) {
		.date {
			color: #aaa;
		}
		.description {
			color: #bbb;
		}
		.posts li.is-draft {
			background-color: rgba(245, 158, 11, 0.08);
			border-color: rgba(245, 158, 11, 0.4);
		}
		.draft-badge {
			background-color: rgba(245, 158, 11, 0.3);
			color: #fbbf24;
		}
	}
</style>
