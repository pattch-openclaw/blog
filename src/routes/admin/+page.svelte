<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let pendingSlug = $state<string | null>(null);
	let successMsg = $state('');

	function handleDelete(slug: string) {
		if (!confirm(`Delete "${slug}"? This cannot be undone.`)) {
			return;
		}
		pendingSlug = slug;
	}
</script>

<svelte:head>
	<title>Admin Dashboard</title>
</svelte:head>

<div class="admin-dashboard">
	<h1>Admin Dashboard</h1>

	{#if data.isSupabase}
		<div class="env-banner">
			<strong>Supabase Mode</strong> — deleting posts removes them from the database permanently.
		</div>
	{/if}

	{#if form?.success}
		<div class="success-banner">
			{form.action === 'deleted' ? '✅ Post deleted' : form.action === 'published' ? '✅ Post published' : form.action === 'unpublished' ? '✅ Post unpublished' : ''}
		</div>
	{/if}

	{#if form?.error}
		<div class="error-banner">
			{form.error}
		</div>
	{/if}

	{#if data.isSupabase && data.posts?.length}
		<div class="posts-section">
			<h2>Manage Posts</h2>
			<div class="posts-list">
				{#each data.posts as post}
					<div class="post-row" class:is-deleting={pendingSlug === post.slug}>
						<div class="post-info">
							<span class="post-title">{post.title}</span>
							<span class="post-meta">
								{#if post.published}
									<span class="badge published">Published</span>
								{:else}
									<span class="badge draft">Draft</span>
								{/if}
								<span>{post.date}</span>
								{#if post.author}
									<span class="author">by {post.author}</span>
								{/if}
								{#if post.tags?.length}
									<span class="tags">
										{#each post.tags as tag}
											<span class="tag-pill">{tag}</span>
										{/each}
									</span>
								{/if}
							</span>
						</div>
						<div class="post-actions">
							<a href="/admin/write?slug={post.slug}" class="btn-edit">Edit</a>
							{#if post.published}
								<form method="POST" use:enhance>
									<input type="hidden" name="slug" value={post.slug} />
									<button type="submit" name="action" value="unpublish" class="btn-unpublish">Unpublish</button>
								</form>
							{:else}
								<form method="POST" use:enhance>
									<input type="hidden" name="slug" value={post.slug} />
									<button type="submit" name="action" value="publish" class="btn-publish">Publish</button>
								</form>
							{/if}
							{#if data.isSupabase}
								<form method="POST" use:enhance onsubmit={() => handleDelete(post.slug)} class="delete-form">
									<input type="hidden" name="slug" value={post.slug} />
									<button type="submit" name="action" value="delete" class="btn-delete" disabled={pendingSlug === post.slug}>
										{pendingSlug === post.slug ? 'Deleting...' : 'Delete'}
									</button>
								</form>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="cards">
		<a href="/admin/write" class="card">
			<h2>Write a New Post</h2>
			<p>Create a draft post, write markdown, and push it directly to the repository.</p>
		</a>
		<a href="/admin/media" class="card">
			<h2>Manage Media</h2>
			<p>Upload, browse, and manage media files served from the repository.</p>
		</a>
		<a href="/admin/logs" class="card">
			<h2>System Logs</h2>
			<p>View application and error logs to debug issues on the staging server.</p>
		</a>
		<a href="/admin/supabase" class="card">
			<h2>Supabase Configuration</h2>
			<p>View current Supabase URL and anon key loaded from the secrets file.</p>
		</a>
		<a href="/admin/schema" class="card">
			<h2>Supabase Schema</h2>
			<p>Inspect the posts table schema, RLS policies, row count, and sample data.</p>
		</a>
	</div>
</div>

<style>
	.admin-dashboard {
		max-width: 800px;
		margin: 0 auto;
		padding-top: 2rem;
	}

	h1 {
		margin-bottom: 0.5rem;
	}

	h2 {
		margin-top: 0;
		font-size: 1.25rem;
		margin-bottom: 1rem;
	}

	p {
		color: #666;
		margin-bottom: 2rem;
	}

	.env-banner {
		background: #fff3cd;
		color: #664d03;
		border: 1px solid #ffecb5;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}

	.success-banner {
		background: #d1e7dd;
		color: #0f5132;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1.5rem;
	}

	.error-banner {
		background: #f8d7da;
		color: #842029;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1.5rem;
	}

	.posts-section {
		margin-bottom: 2rem;
	}

	.posts-list {
		border: 1px solid var(--border-color);
		border-radius: 8px;
		overflow: hidden;
	}

	.post-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-color);
		gap: 1rem;
		flex-wrap: wrap;
	}

	.post-row:last-child {
		border-bottom: none;
	}

	.post-row.is-deleting {
		opacity: 0.5;
		pointer-events: none;
	}

	.post-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		flex: 1;
	}

	.post-title {
		font-weight: 600;
		font-size: 1rem;
	}

	.post-meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
		font-size: 0.85rem;
		color: #666;
	}

	.badge {
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.badge.published {
		background: #d1e7dd;
		color: #0f5132;
	}

	.badge.draft {
		background: #fff3cd;
		color: #664d03;
	}

	.author {
		color: #888;
	}

	.tags {
		display: flex;
		gap: 0.25rem;
	}

	.tag-pill {
		background: var(--link-color);
		color: white;
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		font-size: 0.7rem;
	}

	.post-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-shrink: 0;
	}

	.btn-edit {
		text-decoration: none;
		padding: 0.3rem 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-size: 0.85rem;
		color: var(--text-color);
		background: transparent;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-edit:hover {
		background: rgba(128, 128, 128, 0.1);
	}

	.btn-publish, .btn-unpublish, .btn-delete {
		padding: 0.3rem 0.75rem;
		border-radius: 4px;
		font-size: 0.85rem;
		cursor: pointer;
		white-space: nowrap;
		border: none;
	}

	.btn-publish {
		background: var(--link-color);
		color: white;
	}

	.btn-unpublish {
		background: #fff3cd;
		color: #664d03;
		border: 1px solid #ffecb5;
	}

	.btn-delete {
		background: #f8d7da;
		color: #842029;
		border: 1px solid #f5c2c7;
	}

	.btn-delete:hover:not(:disabled) {
		background: #f5c2c7;
	}

	.btn-delete:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.delete-form {
		display: inline;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.card {
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1.5rem;
		text-decoration: none;
		color: inherit;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		border-color: var(--link-color);
	}

	.card h2 {
		margin-top: 0;
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
		color: var(--text-color);
	}

	.card p {
		margin-bottom: 0;
		font-size: 0.95rem;
		line-height: 1.5;
	}
</style>
