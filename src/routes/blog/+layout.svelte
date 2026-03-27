<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	let { data, children } = $props();
</script>

{#if $page.url.pathname !== '/blog'}
	<div class="post-layout">
		<nav class="post-header">
			<a href="/blog" class="back-link">← Back to posts</a>
			
			{#if data.showAdminControls}
				{#if data.isDraft}
					<form action="/admin?/publish" method="POST" use:enhance class="publish-form">
						<input type="hidden" name="slug" value={data.currentSlug} />
						<button type="submit" class="btn-publish">🚀 Publish Draft</button>
					</form>
				{:else}
					<form action="/admin?/unpublish" method="POST" use:enhance class="publish-form">
						<input type="hidden" name="slug" value={data.currentSlug} />
						<button type="submit" class="btn-unpublish">🔒 Revert to Draft</button>
					</form>
				{/if}
			{/if}
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

	.post-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.back-link {
		color: var(--text-color);
		opacity: 0.6;
		font-size: 0.9rem;
		text-decoration: none;
		transition: opacity 0.2s ease;
	}

	.back-link:hover {
		opacity: 1;
		text-decoration: underline;
	}

	.publish-form {
		margin: 0;
	}

	.btn-publish, .btn-unpublish {
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: opacity 0.2s ease;
	}

	.btn-publish {
		background: #10b981;
		color: #fff;
	}

	.btn-unpublish {
		background: #f59e0b;
		color: #fff;
	}

	.btn-publish:hover, .btn-unpublish:hover {
		opacity: 0.9;
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
