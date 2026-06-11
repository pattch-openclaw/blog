<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head>
	<title>Supabase Configuration</title>
</svelte:head>

<div class="supabase-config">
	<h1>Supabase Configuration</h1>
	<p>Raw environment variables loaded from .blog-secrets at service startup.</p>

	<div class="credentials">
		<div class="field">
			<h3>JWT Role (decoded from SUPABASE_ANON_KEY)</h3>
			<code>{data.jwtRole ?? '(unable to decode)'}</code>
		</div>
		<div class="field">
			<h3>SUPABASE_URL</h3>
			<code>{data.envPairs.SUPABASE_URL}</code>
		</div>
		<div class="field">
			<h3>SUPABASE_ANON_KEY (preview)</h3>
			<code>{data.envPairs.SUPABASE_ANON_KEY}</code>
		</div>
		<div class="field">
			<h3>SUPABASE_ANON_KEY (full)</h3>
			<code>{data.envPairs.SUPABASE_ANON_KEY_FULL}</code>
		</div>
		<div class="field">
			<h3>SUPABASE_SERVICE_KEY (preview)</h3>
			<code>{data.envPairs.SUPABASE_SERVICE_KEY}</code>
		</div>
		<div class="field">
			<h3>SUPABASE_URL_TEST (hardcoded)</h3>
			<code>{data.envPairs.SUPABASE_URL_TEST}</code>
		</div>
	</div>
</div>

<style>
	.supabase-config {
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

	.credentials {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	h3 {
		font-size: 0.875rem;
		font-weight: 600;
		color: #444;
		margin: 0;
	}

	code {
		background: #f4f4f5;
		border: 1px solid #e4e4e7;
		border-radius: 6px;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		word-break: break-all;
		color: #18181b;
	}
</style>
