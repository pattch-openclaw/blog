<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head>
	<title>Supabase Schema | Admin</title>
</svelte:head>

<div class="admin-container wide-layout">
	<div class="admin-main">
		<nav class="admin-nav">
			<a href="/admin">← Back to Admin</a>
		</nav>
		
		<h1>Supabase Schema Inspector</h1>
		<p class="subtitle">Schema inspection via the Supabase dashboard.</p>

		{#if data.error}
			<div class="alert alert-error">
				<strong>Error:</strong> {data.error}
			</div>
		{/if}

		{#if !data.error}
			<p>The Supabase REST API does not expose system catalog tables
			(information_schema, pg_tables, pg_policies), so server-side
			schema introspection is not feasible. Check your schema and RLS
			policies directly in the <a href="{data.url}/project/default/sql/policies" target="_blank">Supabase Dashboard</a>.</p>

			<div class="info-bar">
				<span><strong>URL:</strong> <code>{data.url}</code></span>
				<span><strong>Key:</strong> <code>{data.anonKey}</code></span>
				{#if data.jwtRole}<span><strong>JWT role:</strong> <code>{data.jwtRole}</code></span>{/if}
			</div>

			{#if data.diagError}
				<div class="alert alert-error">
					<strong>Diagnostic Error:</strong> {data.diagError}
				</div>
			{:else}
				<div class="info-bar diag-bar">
					<span><strong>posts visible to anon:</strong> <code>{data.dbPostsCount ?? '—'}</code> rows</span>
					<span><strong>media_entries visible to anon:</strong> <code>{data.dbMediaCount ?? '—'}</code> rows</span>
				</div>

				{#if data.dbPostsRows.length > 0}
					<div class="row-dump">
						<h3>Rows visible to anon role (first 5):</h3>
						<pre>{JSON.stringify(data.dbPostsRows.slice(0, 5), null, 2)}</pre>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</div>

<style>
	.admin-container {
		margin: 0 auto;
		max-width: 1200px;
		padding-bottom: 3rem;
	}

	.admin-nav {
		margin-bottom: 2rem;
	}

	.admin-nav a {
		text-decoration: none;
		color: #666;
	}

	.admin-nav a:hover {
		text-decoration: underline;
	}

	h1 {
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #666;
		margin-bottom: 2rem;
	}

	.subtitle code {
		background: #f4f4f5;
		padding: 0.1em 0.3em;
		border-radius: 3px;
	}

	p {
		color: #444;
		line-height: 1.6;
	}

	p a {
		color: #2563eb;
		text-decoration: underline;
	}

	.info-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		background: #f9f9fb;
		border: 1px solid #e4e4e7;
		border-radius: 6px;
		padding: 1rem 1.5rem;
		margin-top: 2rem;
		font-size: 0.85rem;
	}

	.info-bar code {
		background: #eee;
		padding: 0.1em 0.3em;
		border-radius: 3px;
	}

	.alert {
		padding: 1rem 1.5rem;
		border-radius: 6px;
		margin-bottom: 2rem;
		font-size: 0.9rem;
	}

	.alert-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
	}

	.diag-bar {
		background: #f0f9ff;
		border-color: #bae6fd;
	}

	.row-dump {
		margin-top: 1rem;
	}

	.row-dump h3 {
		font-size: 1rem;
		color: #334155;
		margin-bottom: 0.5rem;
	}

	.row-dump pre {
		background: #1e1e1e;
		color: #e2e8f0;
		padding: 1rem;
		border-radius: 6px;
		overflow-x: auto;
		font-size: 0.8rem;
		white-space: pre-wrap;
		word-break: break-all;
	}
</style>
