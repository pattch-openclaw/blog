<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	
	let title = $state('');
	let slug = $derived(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

	let pending = $state(false);
	let isSuccess = $state(false);
	let successSlug = $state('');

	const handleEnhance = () => {
		pending = true;
		return async ({ result }) => {
			pending = false;
			if (result.type === 'success' && result.data?.success) {
				isSuccess = true;
				successSlug = result.data.slug;
			}
		};
	};
</script>

<svelte:head>
	<title>Write Post | Admin</title>
</svelte:head>

<div class="admin-container">
	<nav class="admin-nav">
		<a href="/blog">← Back to Blog</a>
	</nav>
	
	<h1>Write a New Post</h1>
	<p class="subtitle">This will be saved as a draft initially. Published must be turned on later.</p>
	
	{#if form?.error}
		<div class="error-banner">
			{form.error}
		</div>
	{/if}

	{#if isSuccess}
		<div class="success-panel">
			<h2>🚀 Draft Saved & Pushed!</h2>
			<div class="rebuild-banner">
				<p><strong>CI/CD Pipeline is Rebuilding</strong></p>
				<p>Please wait ~20 seconds for the server to restart, then check out your post:</p>
				<a href="/blog/{successSlug}" class="btn-primary">Go to /blog/{successSlug}</a>
			</div>
			<button class="btn-secondary" onclick={() => { isSuccess = false; title = ''; }}>Write another</button>
		</div>
	{:else}
		<form method="POST" use:enhance={handleEnhance} class="editor-form">
			<div class="form-group">
				<label for="title">Title</label>
				<input type="text" id="title" name="title" bind:value={title} placeholder="A Catchy Blog Title" required />
			</div>

			<div class="form-group">
				<label for="slug">URL Slug</label>
				<input type="text" id="slug" name="slug" value={slug} placeholder="a-catchy-blog-title" required />
				<small>The URL will be /blog/[slug]</small>
			</div>

			<div class="form-group">
				<label for="description">Description</label>
				<textarea id="description" name="description" rows="2" placeholder="A short blurb about the post..."></textarea>
			</div>

			<div class="form-group">
				<label for="content">Markdown Content</label>
				<textarea id="content" name="content" rows="15" placeholder="# Hello World\n\nWrite your markdown here..." required></textarea>
			</div>

			<div class="form-actions">
				<button type="submit" class="btn-primary" disabled={pending}>
					{pending ? 'Saving & Pushing...' : 'Save Draft'}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.admin-container {
		max-width: 800px;
		margin: 0 auto;
	}

	.admin-nav {
		margin-bottom: 2rem;
	}

	.admin-nav a {
		text-decoration: none;
		color: #666;
	}

	.admin-nav a:hover {
		text-decoration: underline;
	}

	h1 {
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #666;
		margin-bottom: 2rem;
	}

	.error-banner {
		background: #fee2e2;
		color: #991b1b;
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 2rem;
	}

	.success-panel {
		text-align: center;
		padding: 2rem 0;
	}

	.rebuild-banner {
		background: rgba(128, 128, 128, 0.1);
		border: 1px solid var(--border-color);
		padding: 2rem;
		border-radius: 8px;
		margin: 2rem 0;
	}

	.editor-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-weight: 600;
	}

	input, textarea {
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		font-family: inherit;
		font-size: 1rem;
		background: transparent;
		color: inherit;
	}

	input:focus, textarea:focus {
		outline: 2px solid var(--link-color);
		border-color: transparent;
	}

	small {
		color: #666;
	}

	.btn-primary {
		display: inline-block;
		text-decoration: none;
		background: var(--text-color);
		color: var(--bg-color);
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		align-self: flex-start;
	}

	.btn-secondary {
		background: transparent;
		color: var(--text-color);
		border: 1px solid var(--border-color);
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-primary:hover:not(:disabled), .btn-secondary:hover {
		opacity: 0.9;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (prefers-color-scheme: dark) {
		.error-banner {
			background: #450a0a;
			color: #fca5a5;
		}
	}
</style>
