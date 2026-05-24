<script lang="ts">
	let { data } = $props();
	let title = 'Welcome';
</script>

<svelte:head>
	<title>{title} | Sam's Blog</title>
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
				<span class="post-date">{new Date(post.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
			</a>
		{/each}
	</div>
</div>
