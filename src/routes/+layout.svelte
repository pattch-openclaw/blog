<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="container">
	<header>
		<h1><a href="/">Sam's Blog</a></h1>
		<nav>
			<a href="/blog">Writing</a>
			<a href="/about">About</a>
		</nav>
	</header>
	
	<main>
		{@render children()}
	</main>
</div>
