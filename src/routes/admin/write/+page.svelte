<script lang="ts">
	import { enhance } from '$app/forms';
	import { marked } from 'marked';

	let { data, form } = $props();
	
	let title = $state(data?.title || '');
	let slug = $state(data?.slug || '');
	
	$effect(() => {
		if (!data?.isEdit && title) {
			slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
		}
	});

	let content = $state(data?.content || '');
	let description = $state(data?.description || '');
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
	<title>{data?.isEdit ? 'Edit Post' : 'Write Post'} | Admin</title>
</svelte:head>

<div class="admin-container">
	<nav class="admin-nav">
		<a href="/blog">← Back to Blog</a>
	</nav>
	
	<h1>{data?.isEdit ? 'Edit Draft' : 'Write a New Post'}</h1>
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
				<input type="text" id="slug" name="slug" bind:value={slug} placeholder="a-catchy-blog-title" required readonly={data?.isEdit} />
				<small>{data?.isEdit ? 'The URL slug cannot be changed while editing.' : 'The URL will be /blog/[slug]'}</small>
			</div>

			<div class="form-group">
				<label for="description">Description</label>
				<textarea id="description" name="description" rows="2" bind:value={description} placeholder="A short blurb about the post..."></textarea>
			</div>

			<div class="form-group editor-group">
				<div class="editor-header">
					<label for="content">Markdown Content</label>
					<button type="button" class="btn-toggle" onclick={() => isPreview = !isPreview}>
						{isPreview ? 'Hide Preview' : 'Show Preview'}
					</button>
				</div>
				
				<div class="editor-split" class:show-preview={isPreview}>
					<textarea id="content" name="content" rows="15" bind:value={content} placeholder="# Hello World\n\nWrite your markdown here..." required></textarea>
					
					{#if isPreview}
						<div class="preview-section">
							<div class="preview-divider mobile-only">Preview</div>
							<div class="preview-box">
								<!-- Use @html safely here since it's an admin context, but ideally sanitize -->
								{@html parsedContent}
							</div>
						</div>
					{/if}
				</div>
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

	.btn-toggle {
		background: rgba(128, 128, 128, 0.1);
		border: 1px solid var(--border-color);
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		color: var(--text-color);
	}

	.btn-toggle:hover {
		background: rgba(128, 128, 128, 0.2);
	}

	.preview-divider {
		margin-top: 1rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
		font-size: 0.9rem;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.preview-box {
		padding: 1rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		min-height: 200px;
		background: rgba(128, 128, 128, 0.05);
	}

	.editor-split {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 1200px) {
		.editor-split.show-preview {
			display: grid;
			/* Keep the left column exactly the same max width as before (768px accounting for 1rem padding) */
			grid-template-columns: min(100%, 768px) 1fr;
			gap: 2rem;
			
			/* Break out of the centered container, filling the space to the right edge of the screen */
			/* 50vw is the screen center. 384px is half of the max 768px container. 
			   This extends exactly to 2rem before the right edge of the viewport. */
			width: calc(50vw + 384px - 2rem);
		}

		.editor-split.show-preview textarea {
			min-height: 500px;
			resize: vertical;
		}

		.editor-split.show-preview .preview-section {
			overflow-y: auto;
		}

		.editor-split.show-preview .mobile-only {
			display: none;
		}

		.editor-split.show-preview .preview-box {
			height: 100%;
			margin-top: 0;
		}
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
