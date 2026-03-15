<script>
	let title = 'Welcome';
</script>

<svelte:head>
	<title>{title} | Sam's Blog</title>
</svelte:head>

<h2>{title}</h2>

<p>Hi, I'm Sam. Welcome to my personal corner of the internet.</p>

<div style="background-color: var(--border-color); padding: 1rem; border-radius: 6px; margin: 1.5rem 0;">
	<p style="margin: 0; font-weight: bold;">🚀 System Status: CI/CD Pipeline Active</p>
	<p style="margin: 0; font-size: 0.9em;">This deployment was automatically built and pushed via GitHub Actions to a self-hosted runner.</p>
</div>

<p>Check out my <a href="/blog">latest writing</a> or read more <a href="/about">about me</a>.</p>
