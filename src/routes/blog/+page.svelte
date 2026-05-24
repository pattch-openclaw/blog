<script lang="ts">
	import './+page.css';
	import { page } from '$app/stores';

	let { data, url } = $props();

	// Get initial tag filter from URL
	const initialTag = $derived(url?.searchParams.get('tag') || '');
	let activeTag = $state(initialTag);

	// Filter posts by active tag
	let filteredPosts = $derived(
		activeTag
			? data.posts.filter((p: typeof data.posts[number]) => p.tags.includes(activeTag))
			: data.posts
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

<h1>Writing</h1>
<p class="subtitle">A collection of my thoughts and experiments.</p>

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
