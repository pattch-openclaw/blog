<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.status} | STS.DEV</title>
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

<style>
	.error-container {
		margin-top: 4rem;
		text-align: center;
	}

	h1 {
		font-size: 4rem;
		margin-bottom: 1rem;
		color: var(--text-color);
	}

	p {
		font-size: 1.25rem;
		color: #666;
		margin-bottom: 2rem;
	}

	.actions {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
	}

	a {
		color: var(--link-color);
		text-decoration: none;
		font-weight: 500;
	}

	a:hover {
		text-decoration: underline;
	}

	.divider {
		color: var(--border-color);
	}

	@media (prefers-color-scheme: dark) {
		p {
			color: #aaa;
		}
	}
</style>
