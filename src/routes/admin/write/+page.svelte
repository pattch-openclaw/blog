<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	
	let title = $state('');
	let slug = $derived(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
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

	<form method="POST" use:enhance class="editor-form">
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
			<button type="submit" class="btn-primary">Save Draft</button>
		</div>
	</form>
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

	.btn-primary:hover {
		opacity: 0.9;
	}

	@media (prefers-color-scheme: dark) {
		.error-banner {
			background: #450a0a;
			color: #fca5a5;
		}
	}
</style>
