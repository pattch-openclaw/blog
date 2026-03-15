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
		<li>
			<span class="date">{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
	}

	.date {
		font-size: 0.875rem;
		color: #666;
		margin-bottom: 0.25rem;
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
	}
</style>
