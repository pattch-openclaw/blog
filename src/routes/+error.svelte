<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.status} | Sam's Blog</title>
</svelte:head>

<div class="error-container">
	<h1>{$page.status}</h1>
	<p>{$page.error?.message ?? 'Page not found.'}</p>
	
	<div class="actions">
		<a href="/" onclick={(e) => { e.preventDefault(); history.back(); }} class="back-link">← Go Back</a>
		<span class="divider">|</span>
		<a href="/" class="home-link">Home</a>
	</div>
</div>
