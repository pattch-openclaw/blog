<script lang="ts">
	import { page } from '$app/stores';

	let { data, url } = $props();

	// Get initial tag filter from URL
	let activeTag = $state('');

	// Sync activeTag when URL changes (e.g., back/forward navigation)
	$effect(() => {
		activeTag = url?.searchParams.get('tag') || '';
	});

	// Compute unique authors from all posts (API already handles draft filtering)
	const authors = $derived(
		Array.from(
			new Set(
				data.posts
					.map((p: typeof data.posts[number]) => p.author)
					.filter(Boolean)
			)
		)
		.sort()
	);

	// Track which authors are currently selected (all checked by default)
	let authorFilters = $state<Record<string, boolean>>({});
	$effect(() => {
		let changed = false;
		for (const author of authors) {
			if (authorFilters[author] === undefined) {
				authorFilters = { ...authorFilters, [author]: true };
				changed = true;
			}
		}
		if (changed) {
			const current = Object.keys(authorFilters);
			for (const author of current) {
				if (!authors.includes(author)) {
					authorFilters = Object.fromEntries(Object.entries(authorFilters).filter(([a]) => a !== author));
				}
			}
		}
	});

	function toggleAuthor(author: string) {
		authorFilters = { ...authorFilters, [author]: !authorFilters[author] };
	}

	// Filter posts by active tag AND active author filters
	let filteredPosts = $derived(
		(() => {
			let result = data.posts;

			// Apply tag filter
			if (activeTag) {
				result = result.filter((p: typeof data.posts[number]) => p.tags.includes(activeTag));
			}

			// Apply author filters — always filter if we have author definitions
			const selectedAuthors = new Set(
				Object.entries(authorFilters)
					.filter(([, active]) => active)
					.map(([author]) => author)
			);

			if (Object.keys(authorFilters).length > 0) {
				result = result.filter((p: typeof data.posts[number]) => selectedAuthors.has(p.author));
			}

			return result;
		})()
	);

	// Compute tag counts for tag cloud
	let tagCloud = $derived(
		data.posts.reduce((acc: Record<string, number>, post: typeof data.posts[number]) => {
			post.tags.forEach((tag: string) => {
				acc[tag] = (acc[tag] || 0) + 1;
			});
			return acc;
		}, {} as Record<string, number>)
	);

	function clearTagFilter() {
		activeTag = '';
		navigateTo('/blog');
	}

	function setTagFilter(tag: string) {
		activeTag = tag;
		navigateTo(`/blog?tag=${encodeURIComponent(tag)}`);
	}

	function navigateTo(path: string) {
		window.location.href = path;
	}
</script>

<svelte:head>
	<title>Writing | Sam's Blog</title>
</svelte:head>

{#if Object.keys(tagCloud).length > 0}
	<div class="tag-cloud">
		<span class="tag-cloud-label">Topics:</span>
		{#each Object.entries(tagCloud).sort((a: any, b: any) => b[1] - a[1]) as [tag, count]}
			<button
				class="tag-pill" class:active-tag={activeTag === tag}
				onclick={() => setTagFilter(tag)}
			>{tag} {count}</button>
		{/each}
		{#if activeTag}
			<button class="clear-filter" onclick={clearTagFilter}>✕ clear</button>
		{/if}
	</div>
{/if}

{#if activeTag}
	<p class="filter-info">Showing posts tagged "{activeTag}"</p>
{/if}

{#if authors.length > 0}
	<div class="author-filter" role="group" aria-label="Filter by author">
		{#each authors as author}
			<button
				type="button"
				class="author-pill"
				class:author-active={authorFilters[author]}
				onclick={() => toggleAuthor(author)}
				onkeydown={(e) => e.key === 'Enter' && toggleAuthor(author)}
				aria-pressed={authorFilters[author]}
			>
				<span class="author-name">{author}</span>
				<span class="author-count">{data.posts.filter((p: typeof data.posts[number]) => p.author === author).length}</span>
			</button>
		{/each}
	</div>
{/if}

{#if filteredPosts.length === 0}
	<p class="no-posts">No posts found.</p>
{:else}
	<ul class="posts">
		{#each filteredPosts as post}
			<li class:is-draft={!post.published}>
				<div class="post-meta">
					<span class="date">{new Date(post.date).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</span>
					<span class="author-badge">{post.author === 'ai' ? post.author + ' 🦞' : post.author}</span>
					<div class="post-tags">
						{#each post.tags as tag}
							<a class="post-tag" href="/blog?tag={encodeURIComponent(tag)}">{tag}</a>
						{/each}
					</div>
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
{/if}

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

	.tag-cloud {
		margin: 1rem 0 2rem 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.tag-cloud-label {
		font-weight: 600;
		color: #666;
		font-size: 0.875rem;
	}

	.tag-pill {
		padding: 0.25rem 0.6rem;
		border-radius: 9999px;
		border: 1px solid var(--border-color);
		background: transparent;
		color: var(--text-color);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
	}

	.tag-pill:hover {
		background: rgba(128, 128, 128, 0.1);
	}

	.tag-pill.active-tag {
		background: var(--link-color);
		color: white;
		border-color: var(--link-color);
	}

	.clear-filter {
		padding: 0.25rem 0.6rem;
		border: 1px solid #e5e7eb;
		background: transparent;
		color: #666;
		font-size: 0.8rem;
		cursor: pointer;
		border-radius: 4px;
		font-family: inherit;
	}

	.clear-filter:hover {
		color: #000;
	}

	.filter-info {
		color: #666;
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.author-filter {
		margin: 0.5rem 0 1rem 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}

	.author-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: #999;
		cursor: pointer;
		padding: 0.15rem 0.5rem;
		border-radius: 9999px;
		transition: all 0.15s ease;
		user-select: none;
		border: 1px solid transparent;
	}

	.author-pill:hover {
		background: rgba(128, 128, 128, 0.08);
	}

	.author-pill.author-active {
		color: var(--text-color);
		background: rgba(128, 128, 128, 0.12);
		border-color: rgba(128, 128, 128, 0.2);
	}

	.author-pill:not(.author-active) {
		background: rgba(128, 128, 128, 0.05);
	}

	.author-count {
		font-size: 0.7rem;
		color: #aaa;
		background: none;
		padding: 0;
		border-radius: 0;
	}

	.no-posts {
		color: #666;
		font-style: italic;
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
		.tag-pill {
			border-color: #444;
		}
		.tag-pill:hover {
			background: rgba(128, 128, 128, 0.2);
		}
		.clear-filter {
			border-color: #444;
		}
		.post-tag {
			background: rgba(128, 128, 128, 0.15);
		}
		.post-tag:hover {
			background: rgba(128, 128, 128, 0.25);
		}
	}
</style>
