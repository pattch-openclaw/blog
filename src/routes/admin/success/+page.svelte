<script lang="ts">
	import { page } from '$app/stores';

	let slug = $page.url.searchParams.get('slug') || '';
	let action = $page.url.searchParams.get('action') || 'draft';
	
	let titleText = '🚀 Draft Saved & Pushed';
	if (action === 'published') titleText = '🚀 Post Published & Pushed';
	if (action === 'unpublished') titleText = '🔒 Post Reverted to Draft';

	let subtitleText = 'Your new post was written to the filesystem and automatically pushed to the GitHub repository.';
	if (action === 'published') subtitleText = 'Your post was published and automatically pushed to the GitHub repository.';
	if (action === 'unpublished') subtitleText = 'Your post is now hidden in production and the update was pushed to the GitHub repository.';
</script>

<svelte:head>
	<title>{action === 'published' ? 'Post Published' : action === 'unpublished' ? 'Post Reverted' : 'Draft Saved'} | Admin</title>
</svelte:head>

<div class="success-container">
	<h1>{titleText}</h1>
	<p class="subtitle">{subtitleText}</p>

	<div class="rebuild-banner">
		<p><strong>CI/CD Pipeline is Rebuilding</strong></p>
		<p>Because SvelteKit compiles markdown files as static routes at build time, the server needs to pull and rebuild to serve the new status.</p>
		<p>It usually takes about 20-30 seconds. Your post will be available at:</p>
		<a href="/blog/{slug}" class="btn-primary">Go to /blog/{slug}</a>
	</div>

	<a href="/admin/write" class="write-another">← Write another post</a>
</div>

<style>
	.success-container {
		max-width: 600px;
		margin: 4rem auto 0;
		text-align: center;
	}

	h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #666;
		margin-bottom: 2rem;
		font-size: 1.1rem;
	}

	.rebuild-banner {
		background: rgba(128, 128, 128, 0.1);
		border: 1px solid var(--border-color);
		padding: 2rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}

	.rebuild-banner p {
		margin-bottom: 1rem;
	}

	.btn-primary {
		display: inline-block;
		background: var(--link-color);
		color: #fff;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		text-decoration: none;
		margin-top: 1rem;
	}

	.btn-primary:hover {
		opacity: 0.9;
		text-decoration: none;
	}

	.write-another {
		color: #666;
		text-decoration: none;
	}

	.write-another:hover {
		text-decoration: underline;
		color: var(--text-color);
	}
</style>
