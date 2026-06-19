<script lang="ts">
	import '../app.css';
	let { children, data } = $props();
</script>

<div class="container">
	<header>
		<h1><a href="/" class="brand">STS.DEV</a></h1>
		<nav>
			<a href="/blog">Writing</a>
			<a href="/about">About</a>
			{#if data.showAdmin}
				<a href="/admin" class="btn-admin">Admin</a>
			{/if}
		</nav>
	</header>
	
	<main>
		{@render children()}
	</main>
</div>

<style>
	.brand {
		font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-color);
	}
</style>
