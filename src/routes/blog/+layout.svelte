<script lang="ts">
	import { page } from '$app/stores';
	let { children } = $props();

	// Check if we're on a specific blog post, rather than the blog index
	$effect(() => {
		// Just to watch url
	});
</script>

{#if $page.url.pathname !== '/blog'}
	<div class="post-layout">
		<nav class="back-link">
			<a href="/blog">← Back to posts</a>
		</nav>
		
		<article class="prose">
			{@render children()}
		</article>
	</div>
{:else}
	{@render children()}
{/if}

<style>
	.post-layout {
		margin-top: 2rem;
	}

	.back-link {
		margin-bottom: 2rem;
	}

	.back-link a {
		color: var(--text-color);
		opacity: 0.6;
		font-size: 0.9rem;
		text-decoration: none;
		transition: opacity 0.2s ease;
	}

	.back-link a:hover {
		opacity: 1;
		text-decoration: underline;
	}

	.prose {
		max-width: 65ch;
	}

	.prose :global(h1) {
		font-size: 2.5rem;
		margin-bottom: 1.5rem;
		line-height: 1.2;
	}

	.prose :global(h2) {
		font-size: 1.75rem;
		margin-top: 2.5rem;
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
</style>
