<script lang="ts">
	let { data, page } = $props();
</script>

<svelte:head>
	<title>{page.data.tag} | Writing</title>
</svelte:head>

<nav class="back-link">
	<a href="/blog">← All posts</a>
</nav>

<h1>Posts tagged "{page.data.tag}"</h1>
<p class="count">{data.posts.length} post{data.posts.length !== 1 ? 's' : ''}</p>

<ul class="posts">
	{#each data.posts as post}
		<li>
			<div class="post-meta">
				<span class="date">{new Date(post.date).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</span>
				<span class="author-badge">{post.author === 'ai' ? post.author + ' 🦞' : post.author}</span>
				<div class="post-tags">
					{#each post.tags as tag}
						<a class="post-tag" href="/blog?tag={encodeURIComponent(tag)}">{tag}</a>
					{/each}
				</div>
			</div>
			<a class="title" href="/blog/{post.slug}">{post.title}</a>
			{#if post.description}
				<p class="description">{post.description}</p>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.back-link {
		margin-bottom: 2rem;
	}

	.back-link a {
		text-decoration: none;
		color: #666;
	}

	.back-link a:hover {
		text-decoration: underline;
	}

	h1 {
		margin-bottom: 0.25rem;
	}

	.count {
		color: #666;
		margin-bottom: 2rem;
	}

	.posts {
		list-style: none;
		padding: 0;
	}

	.posts li {
		margin-bottom: 2rem;
		display: flex;
		flex-direction: column;
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.25rem;
		flex-wrap: wrap;
	}

	.date {
		font-size: 0.875rem;
		color: #666;
	}

	.author-badge {
		font-size: 0.8rem;
		color: #888;
		font-weight: 500;
	}

	.post-tags {
		display: flex;
		gap: 0.35rem;
		margin-left: auto;
	}

	.post-tag {
		font-size: 0.75rem;
		color: var(--link-color);
		text-decoration: none;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		background: rgba(128, 128, 128, 0.05);
	}

	.post-tag:hover {
		background: rgba(128, 128, 128, 0.15);
	}

	.title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-color);
		line-height: 1.2;
		margin-bottom: 0.5rem;
		text-decoration: none;
	}

	.title:hover {
		color: var(--link-color);
	}

	.description {
		margin: 0;
		color: #555;
	}
</style>
