<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head>
	<title>Supabase Configuration</title>
</svelte:head>

<div class="supabase-config">
	<h1>Supabase Configuration</h1>
	<p>Current Supabase credentials loaded from the secrets file.</p>

	<div class="credentials">
		<div class="field">
			<label>Supabase URL</label>
			<code>{data.supabaseUrl}</code>
		</div>
		<div class="field">
			<label>Supabase Anon Key</label>
			<code>{data.supabaseAnonKey}</code>
		</div>
		<div class="field">
			<label>SUPABASE_URL_TEST (hardcoded)</label>
			<code>{data.supabaseUrlTest}</code>
		</div>
	</div>

	{#if 'secretsDebug' in data}
		<div class="debug">
			<h2>Secrets File Debug</h2>
			{#if data.secretsDebug.found}
				<p class="success">✅ Secrets file found ({data.secretsDebug.fileSize} bytes, {data.secretsDebug.lines.length} lines)</p>
				<h3>Parsed KEY=VALUE pairs:</h3>
				<details>
					<summary>Show all keys ({data.secretsDebug.pairs.length})</summary>
					<pre>{data.secretsDebug.pairs.map(p => `${p.key} = [${p.value.length}] ${p.value}`).join('\n')}</pre>
				</details>
				<h3>Raw file contents (lines):</h3>
				<pre>{data.secretsDebug.lines.map((l, i) => `${String(i + 1).padStart(3)}: ${l}`).join('\n')}</pre>
			{:else}
				<p class="error">❌ Error reading secrets file: {data.secretsDebug.error}</p>
			{/if}
		</div>
	{/if}
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

	label {
		font-weight: 600;
		color: #444;
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
