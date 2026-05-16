<script lang="ts">
	import { enhance } from '$app/forms';
	import { marked } from 'marked';

	let { form } = $props();
	
	let title = $state('');
	let slug = $derived(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

	let content = $state('');
	let isPreview = $state(false);
	let parsedContent = $derived(marked.parse(content));

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
				<div class="editor-header">
					<label for="content">Markdown Content</label>
					<div class="editor-tabs">
						<button type="button" class="tab {isPreview ? '' : 'active'}" onclick={() => isPreview = false}>Write</button>
						<button type="button" class="tab {isPreview ? 'active' : ''}" onclick={() => isPreview = true}>Preview</button>
					</div>
				</div>
				
				{#if isPreview}
					<div class="preview-box">
						<!-- Use @html safely here since it's an admin context, but ideally sanitize -->
						{@html parsedContent}
					</div>
					<input type="hidden" name="content" value={content} />
				{:else}
					<textarea id="content" name="content" rows="15" bind:value={content} placeholder="# Hello World\n\nWrite your markdown here..." required></textarea>
				{/if}
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

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.editor-tabs {
		display: flex;
		gap: 0.5rem;
		background: rgba(128, 128, 128, 0.1);
		padding: 0.25rem;
		border-radius: 6px;
	}

	.editor-tabs .tab {
		background: transparent;
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		color: var(--text-color);
		opacity: 0.7;
	}

	.editor-tabs .tab.active {
		background: var(--bg-color);
		opacity: 1;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		font-weight: 500;
	}

	.preview-box {
		padding: 1rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		min-height: 200px;
		background: rgba(128, 128, 128, 0.05);
	}

	/* Simple markdown preview styles */
	.preview-box :global(h1), .preview-box :global(h2), .preview-box :global(h3) {
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}
	.preview-box :global(h1:first-child), .preview-box :global(h2:first-child), .preview-box :global(h3:first-child) {
		margin-top: 0;
	}
	.preview-box :global(p) {
		margin-bottom: 1rem;
		line-height: 1.6;
	}
	.preview-box :global(ul), .preview-box :global(ol) {
		margin-left: 1.5rem;
		margin-bottom: 1rem;
	}
	.preview-box :global(pre) {
		background: #1e1e1e;
		color: #fff;
		padding: 1rem;
		border-radius: 6px;
		overflow-x: auto;
		margin-bottom: 1rem;
	}
	.preview-box :global(code) {
		font-family: monospace;
		background: rgba(128,128,128,0.2);
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
	}
	.preview-box :global(pre code) {
		background: transparent;
		padding: 0;
	}
	.preview-box :global(blockquote) {
		border-left: 4px solid var(--border-color);
		padding-left: 1rem;
		margin-left: 0;
		color: #666;
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
