<script lang="ts">
	import type { PageData } from './$types';

	interface PostSummary {
		slug: string;
		title: string;
		date: string;
		description: string;
		published: boolean;
		author: string;
		tags: string[];
	}

	export let data: PageData;

	let selectedSlug: string = '';
	let migrating = false;
	let result: { success: boolean; postSlug: string; mediaCount: number; errors: string[]; directUrl: string } | null = null;

	function onSelectChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedSlug = target.value;
		result = null;
	}

	function getSelectedPost(): PostSummary | null {
		return data.posts.find((p) => p.slug === selectedSlug) || null;
	}
</script>

<svelte:head>
	<title>Migrate to Supabase — Admin</title>
</svelte:head>

<div class="migrate-page">
	<h1>Migrate to Supabase</h1>
	<p class="subtitle">Promote a git-based blog post and its media to the Supabase backend.</p>

	<!-- Post selector -->
	<div class="form-section">
		<label for="post-select">Select a post to migrate:</label>
		<select id="post-select" bind:value={selectedSlug} on:change={onSelectChange}>
			<option value="">— Choose a post —</option>
			{#each data.posts as post}
				<option value={post.slug}>{post.title} ({post.date})</option>
			{/each}
		</select>

		{#if getSelectedPost()}
			{#each data.posts as post}
				{#if post.slug === selectedSlug}
					<div class="post-preview">
						<h2>{post.title}</h2>
						<p class="meta">{post.date} · by {post.author} · {post.tags.length > 0 ? 'tags: ' + post.tags.join(', ') : 'no tags'}</p>
						{#if post.description}
							<p class="desc">{post.description}</p>
						{/if}
					</div>
				{/if}
			{/each}
		{/if}

		{#if selectedSlug}
			<form method="POST" action="?/migrate" on:submit={() => migrating = true}>
				<input type="hidden" name="slug" value={selectedSlug} />
				<button type="submit" class="btn-migrate" disabled={migrating}>
					{#if migrating}
						⏳ Migrating...
					{:else}
						🚀 Migrate to Supabase
					{/if}
				</button>
			</form>
		{/if}
	</div>

	<!-- Result display -->
	{#if result}
		<div class="result-box {result.success ? 'success' : 'error'}">
			{#if result.success}
				<h3>✅ Migration successful!</h3>
				<p>Post <strong>{result.postSlug}</strong> migrated with <strong>{result.mediaCount}</strong> media file(s).</p>
				<a href="{result.directUrl}" class="btn-view">View on site →</a>
			{:else}
				<h3>⚠️ Migration had issues</h3>
				<p>Some steps may have failed. Check the details below:</p>
			{/if}
			{#if result.errors && result.errors.length > 0}
				<ul class="errors">
					{#each result.errors as error}
						<li>{error}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<!-- Info callout -->
	<div class="info-callout">
		<p><strong>Note:</strong> This tool reads posts from your local git repository and writes them to the Supabase database. Media files (images, audio, fonts) referenced in the post are uploaded to the corresponding Supabase Storage bucket. Existing Supabase posts with the same slug will not be overwritten — a new entry is created.</p>
	</div>
</div>

<style>
	.migrate-page {
		max-width: 720px;
		margin: 0 auto;
		padding-top: 2rem;
	}

	h1 {
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: #666;
		margin-bottom: 2rem;
	}

	.form-section {
		margin-bottom: 2rem;
	}

	label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	select {
		width: 100%;
		padding: 0.75rem;
		font-size: 1rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	.post-preview {
		background: #f8f8f8;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.post-preview h2 {
		margin: 0 0 0.25rem;
		font-size: 1.1rem;
	}

	.meta {
		color: #666;
		font-size: 0.85rem;
		margin: 0 0 0.5rem;
	}

	.desc {
		color: #444;
		font-size: 0.95rem;
		margin: 0;
	}

	.btn-migrate {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		background: var(--link-color);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.btn-migrate:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-migrate:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.result-box {
		border-radius: 6px;
		padding: 1.25rem;
		margin-bottom: 2rem;
	}

	.result-box.success {
		background: #e6f9ee;
		border: 1px solid #a3d9b1;
	}

	.result-box.error {
		background: #fff3e6;
		border: 1px solid #f5c67d;
	}

	.result-box h3 {
		margin-top: 0;
	}

	.result-box p {
		margin-bottom: 0.75rem;
	}

	.errors {
		color: #856404;
		background: rgba(0,0,0,0.03);
		border-radius: 4px;
		padding: 0.75rem 1.25rem;
		margin: 0.75rem 0;
	}

	.errors li {
		margin-bottom: 0.25rem;
	}

	.btn-view {
		display: inline-block;
		padding: 0.5rem 1rem;
		background: var(--link-color);
		color: white;
		text-decoration: none;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.info-callout {
		background: #f0f4ff;
		border: 1px solid #c5d3f5;
		border-radius: 6px;
		padding: 1rem 1.25rem;
	}

	.info-callout p {
		margin: 0;
		font-size: 0.9rem;
		color: #444;
	}
</style>
