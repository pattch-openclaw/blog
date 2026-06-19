<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { marked } from 'marked';

	let { data, form } = $props();
	
	// Use derived values from props for initial state, $state for mutable values
	let title = $state('');
	let slug = $state('');
	let content = $state('');
	let description = $state('');
	let author = $state('sam');
	let tags = $state<string[]>([]);
	
	// Initialize state from props on mount
	$effect(() => {
		if (data) {
			title = data?.title || '';
			slug = data?.slug || '';
			content = data?.content || '';
			description = data?.description || '';
			author = data?.author || 'sam';
			tags = data?.tags || [];
		}
	});
	
	$effect(() => {
		if (!data?.isEdit && title) {
			slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
		}
	});

	let isPreview = $state(false);
	let parsedContent = $derived(marked.parse(content));

	// Track selected image object instead of just filename
	let selectedImageEntry = $state<{ filename: string; public_url: string; preview_url?: string } | null>(null);

	let imageMarkdown = $derived(selectedImageEntry ? `![${selectedImageEntry.filename}](${selectedImageEntry.public_url})` : '');
	let imagePreviewUrl = $derived(selectedImageEntry ? (selectedImageEntry.preview_url || selectedImageEntry.public_url) : '');

	// Author state
	const AUTHORS = [
		{ value: 'sam', label: 'sam' },
		{ value: 'ai', label: 'ai 🦞' },
		{ value: '__custom__', label: 'Other...' }
	];
	let customAuthor = $state('');
	let displayAuthor = $derived(author === '__custom__' ? customAuthor : author);

	// Tag state
	let tagInput = $state('');
	let showTagSuggestions = $state(false);
	let tagSuggestions = $derived(
		tagInput
			? (data?.allTags || [])
				.filter((t: string) => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t))
				.slice(0, 10)
			: []
	);

	let pending = $state(false);
	let isSuccess = $state(false);
	let successSlug = $state('');
	let isSupabase = $state(false);

	const handleEnhance: SubmitFunction = () => {
		pending = true;
		return async ({ result }) => {
			pending = false;
			if (result.type === 'success' && result.data?.success) {
				isSuccess = true;
				successSlug = result.data.slug;
				isSupabase = result.data.isSupabase ?? false;
			}
		};
	};

	function addTag(tag: string) {
		const normalized = tag.toLowerCase().trim();
		if (normalized && !tags.includes(normalized)) {
			tags = [...tags, normalized];
		}
		tagInput = '';
		showTagSuggestions = false;
	}

	function removeTag(tag: string) {
		tags = tags.filter((t: string) => t !== tag);
	}

	function handleTagKeydown(e: KeyboardEvent<HTMLElement>) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag(tagInput);
		} else if (e.key === 'Backspace' && !tagInput && tags.length) {
			tags = tags.slice(0, -1);
		}
	}
</script>

<svelte:head>
	<title>{data?.isEdit ? 'Edit Post' : 'Write Post'} | Admin</title>
</svelte:head>

<div class="admin-container" class:wide-layout={isPreview}>
	<div class="admin-main">
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
				<h2>🚀 Draft Saved!</h2>
				{#if isSupabase}
					<div class="rebuild-banner">
						<p>Your post is ready to view:</p>
						<a href="/blog/{successSlug}" class="btn-primary">Go to /blog/{successSlug}</a>
					</div>
				{:else}
					<div class="rebuild-banner">
						<p><strong>CI/CD Pipeline is Rebuilding</strong></p>
						<p>Please wait ~20 seconds for the server to restart, then check out your post:</p>
						<a href="/blog/{successSlug}" class="btn-primary">Go to /blog/{successSlug}</a>
					</div>
				{/if}
				<button class="btn-secondary" onclick={() => { isSuccess = false; title = ''; }}>Write another</button>
			</div>
		{:else}
			<form method="POST" use:enhance={handleEnhance} class="editor-form" class:show-preview={isPreview}>
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

				<div class="form-group">
					<label for="author">Author</label>
					<select id="author" name="author" bind:value={author}>
						{#each AUTHORS as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
					{#if author === '__custom__'}
						<input 
							type="text" 
							id="custom-author" 
							name="customAuthor" 
							bind:value={customAuthor} 
							placeholder="Custom author name" 
							style="margin-top: 0.5rem;"
						/>
					{/if}
				</div>

				<div class="form-group">
					<label for="tags">Tags</label>
					<input type="hidden" name="tags" value={tags.join(',')} />
					<div class="tags-input-container" role="combobox" aria-haspopup="listbox" aria-expanded={showTagSuggestions} aria-controls="tag-listbox" tabindex="0" onkeydown={handleTagKeydown}>
						{#each tags as tag}
						<span class="tag-badge">
							{tag}
							<button type="button" class="tag-remove" onclick={() => removeTag(tag)} title="Remove tag">×</button>
						</span>
						{/each}
						<input 
							type="text" 
							id="tags" 
							name="tags" 
							bind:value={tagInput} 
							onfocus={() => tagInput && (showTagSuggestions = true)} 
							onblur={() => setTimeout(() => showTagSuggestions = false, 200)} 
							placeholder="Type a tag and press Enter"
							autocomplete="off"
						/>
						{#if showTagSuggestions && tagSuggestions.length}
							<ul class="tag-suggestions" role="listbox" id="tag-listbox" tabindex="-1">
								{#each tagSuggestions as suggestion}
									<li role="option" aria-selected="false">
										<button type="button" class="tag-suggestion-btn" onclick={() => addTag(suggestion)} onkeydown={(e) => e.key === 'Enter' && addTag(suggestion)}>
											{suggestion}
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
					{#if tags.length}
						<small>Press Enter to add, or click a suggestion above. Use Backspace to remove the last tag.</small>
					{/if}
				</div>
				{#if data.images && data.images.length > 0}
					<div class="form-group image-picker-group">
						<label for="image-picker">Insert Image</label>
						<div class="image-picker-controls">
							<select id="image-picker" bind:value={selectedImageEntry} >
								<option value="">-- Select an image to insert --</option>
								{#each data.images as img}
									<option value={img}>{img.filename}</option>
								{/each}
							</select>
							
							{#if selectedImageEntry}
								<div class="copy-wrapper">
									<input 
										type="text" 
										readonly 
										value={imageMarkdown} 
										class="copy-field" 
										onclick={(e) => { 
											e.currentTarget.select(); 
										}} 
									/>
									<button 
										type="button" 
										class="btn-copy" 
										onclick={() => navigator.clipboard.writeText(imageMarkdown)}
										title="Copy markdown"
									>
										<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
										Copy
									</button>
								</div>
							{/if}
						</div>
						{#if selectedImageEntry}
							<div class="image-preview-container">
								<button type="button" class="btn-close" onclick={() => selectedImageEntry = null} title="Close preview">
									<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
								</button>
								<img src={imagePreviewUrl} alt="Preview" class="image-preview-img" />
								<small><em>Use the copy button above to copy the markdown, then paste into your content.</em></small>
							</div>
						{/if}
					</div>
				{/if}

				<div class="form-group editor-group">
					<div class="editor-header">
						<label for="content">Markdown Content</label>
						<button type="button" class="btn-toggle" onclick={() => isPreview = !isPreview}>
							{isPreview ? 'Hide Preview' : 'Show Preview'}
						</button>
					</div>
					
					<textarea id="content" name="content" rows="15" bind:value={content} placeholder="# Hello World\n\nWrite your markdown here..." required></textarea>
				</div>

				<div class="form-actions">
					<button type="submit" class="btn-primary" disabled={pending}>
						{pending ? 'Saving...' : 'Save Draft'}
					</button>
				</div>
			</form>
		{/if}
	</div>

	{#if isPreview && !isSuccess}
		<div class="admin-preview">
			<div class="preview-divider mobile-only">Preview</div>
			<div class="preview-box">
				<!-- Use @html safely here since it's an admin context, but ideally sanitize -->
				{@html parsedContent}
			</div>
		</div>
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

	.editor-form.show-preview textarea#content {
		min-height: 500px;
	}

	@media (min-width: 1200px) {
		.admin-container.wide-layout {
			/* Break out of the 800px max-width wrapper by using screen width math */
			width: calc(100vw - 4rem);
			margin-left: calc(50% - 50vw + 2rem);
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 2rem;
			align-items: start;
		}

		.admin-container.wide-layout .admin-main {
			max-width: 800px; /* Keep the form itself readable */
			margin-left: auto; /* Align towards center if screen is huge */
			width: 100%;
		}

		.admin-preview {
			position: sticky;
			top: 2rem;
			height: calc(100vh - 4rem);
			display: flex;
			flex-direction: column;
			max-width: 800px;
			margin-right: auto;
			width: 100%;
		}

		.preview-box {
			flex: 1;
			overflow-y: auto;
			margin-top: 0;
			height: 100%;
		}

		.admin-preview .mobile-only {
			display: none;
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
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow-wrap: anywhere;
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
	.preview-box :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 6px;
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

	input:focus, textarea:focus, select:focus {
		outline: 2px solid var(--link-color);
		border-color: transparent;
	}

	small {
		color: #666;
	}

	.tags-input-container {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		min-height: 44px;
		align-items: center;
		cursor: text;
	}

	.tags-input-container:focus-within,
	.tags-input-container:focus {
		outline: 2px solid var(--link-color);
		border-color: transparent;
	}

	.tag-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.15rem 0.4rem;
		background: var(--link-color);
		color: white;
		border-radius: 4px;
		font-size: 0.8rem;
	}

	.tag-remove {
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		padding: 0;
		font-size: 1rem;
		line-height: 1;
		opacity: 0.7;
	}

	.tag-remove:hover {
		opacity: 1;
	}

	.tag-suggestions {
		position: absolute;
		top: 100%;
		left: 0;
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		background: var(--bg-color);
		max-height: 150px;
		overflow-y: auto;
		width: 100%;
		z-index: 10;
	}

	.tag-suggestions li {
		list-style: none;
		padding: 0;
	}

	.tag-suggestion-btn {
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		font-size: 0.875rem;
		background: none;
		border: none;
		border-radius: 0;
	}

	.tag-suggestion-btn:hover,
	.tag-suggestion-btn:focus {
		background: rgba(128, 128, 128, 0.1);
		outline: none;
	}

	.image-picker-controls {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.image-picker-controls select {
		flex: 1;
		min-width: 200px;
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		font-family: inherit;
		font-size: 1rem;
		background: transparent;
		color: inherit;
	}

	.copy-wrapper {
		display: flex;
		flex: 2;
		min-width: 300px;
		gap: 0.5rem;
	}

	.copy-field {
		flex: 1;
		background: rgba(128, 128, 128, 0.05);
		cursor: text;
		font-family: monospace;
		font-size: 0.9rem;
	}

	.btn-copy {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		background: var(--text-color);
		color: var(--bg-color);
		border: none;
		padding: 0 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.btn-copy:hover {
		opacity: 0.9;
	}

	.image-preview-container {
		margin-top: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 1rem;
		background: rgba(128, 128, 128, 0.05);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: flex-start;
		position: relative;
	}

	.btn-close {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgba(128, 128, 128, 0.1);
		border: 1px solid var(--border-color);
		color: var(--text-color);
		border-radius: 50%;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
	}

	.btn-close:hover {
		background: rgba(128, 128, 128, 0.2);
	}

	.image-preview-img {
		max-height: 200px;
		max-width: 100%;
		border-radius: 4px;
		display: block;
		border: 1px solid var(--border-color);
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
