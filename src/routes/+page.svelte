<script lang="ts">
	let { data } = $props();
	let title = 'Welcome';
</script>

<svelte:head>
	<title>{title} | STS.DEV</title>
</svelte:head>

<div class="hero">
	<h2>Hi, I'm Sam.</h2>
	<p class="subtitle">Welcome to my personal corner of the internet, where I share my thoughts on software, life, and building cool things.</p>
	<div class="actions">
		<a href="/blog" class="btn btn-primary">Read my writing</a>
		<a href="/about" class="btn btn-secondary">More about me</a>
	</div>
</div>

<div class="recent-posts">
	<h3>Recent Posts</h3>
	<div class="post-list">
		{#each data.recentPosts as post}
			<a href="/blog/{post.slug}" class="post-btn">
				<span class="post-title">{post.title}</span>
				{#if post.author}
					<span class="post-author">{post.author === 'ai' ? post.author + ' 🦞' : post.author}</span>
				{/if}
				<span class="post-date">{new Date(post.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
			</a>
		{/each}
	</div>
</div>

<style>
	.hero {
		text-align: center;
		padding: 4rem 1rem;
		background: rgba(128, 128, 128, 0.05);
		border-radius: 12px;
		margin: 2rem 0;
	}
	
	.hero h2 {
		font-size: 2.5rem;
		margin-top: 0;
		margin-bottom: 1rem;
	}
	
	.subtitle {
		font-size: 1.2rem;
		max-width: 600px;
		margin: 0 auto 2rem auto;
		color: var(--text-color);
		opacity: 0.8;
	}
	
	.actions {
		display: flex;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	
	.btn {
		padding: 0.6rem 1.2rem;
		border-radius: 6px;
		font-weight: 600;
		text-decoration: none;
		transition: transform 0.1s, opacity 0.2s;
	}
	
	.btn:hover {
		transform: translateY(-2px);
		text-decoration: none;
	}
	
	.btn-primary {
		background-color: var(--link-color);
		color: var(--bg-color) !important;
	}
	
	.btn-primary:hover {
		opacity: 0.9;
	}
	
	.btn-secondary {
		background-color: transparent;
		color: var(--text-color) !important;
		border: 1px solid var(--border-color);
	}
	
	.btn-secondary:hover {
		background-color: rgba(128, 128, 128, 0.1);
	}

	.recent-posts {
		margin-top: 3rem;
		text-align: center;
	}
	
	.recent-posts h3 {
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.6;
		margin-bottom: 1.5rem;
	}

	.post-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 600px;
		margin: 0 auto;
	}

	.post-btn {
		display: flex;
		align-items: center;
		padding: 1rem 1.5rem;
		background: rgba(128, 128, 128, 0.05);
		border-radius: 8px;
		color: var(--text-color);
		text-decoration: none;
		transition: background-color 0.2s, transform 0.1s;
		border: 1px solid var(--border-color);
	}

	.post-btn:hover {
		background-color: rgba(128, 128, 128, 0.1);
		transform: translateY(-2px);
		text-decoration: none;
	}

	.post-title {
		flex: 1;
		font-weight: 600;
	}

	.post-author {
		font-size: 0.85rem;
		color: #888;
		font-weight: 500;
		margin-left: 1rem;
		margin-right: 1rem;
	}

	.post-date {
		font-size: 0.9rem;
		opacity: 0.7;
	}
</style>
