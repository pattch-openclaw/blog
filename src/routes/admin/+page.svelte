<script lang="ts">
	// Admin dashboard just links to the write post page for now
</script>

<svelte:head>
	<title>Admin Dashboard</title>
</svelte:head>

<div class="admin-dashboard">
	<h1>Admin Dashboard</h1>
	<p>Welcome to the Staging Environment Admin Console.</p>

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

	p {
		color: #666;
		margin-bottom: 2rem;
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
