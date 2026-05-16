<script>
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
</style>
