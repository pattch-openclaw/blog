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
		<p class="subtitle">Inspects the <code>posts</code> table schema in Supabase.</p>

		{#if data.error}
			<div class="alert alert-error">
				<strong>Error:</strong> {data.error}
			</div>
		{/if}

		{#if !data.error}
			<!-- Connection Info -->
			<div class="info-bar">
				<span><strong>URL:</strong> <code>{data.url}</code></span>
				<span><strong>Key:</strong> <code>{data.anonKey}</code></span>
				<span><strong>RLS:</strong> {data.rlsEnabled ? '🟢 Enabled' : '🔴 Disabled'}</span>
				<span><strong>Rows:</strong> {data.rowCount ?? '?'}</span>
			</div>

			<!-- RLS Policies -->
			{#if data.rlsEnabled && data.rlsPolicies.length > 0}
				<div class="rls-section">
					<h2>RLS Policies</h2>
					<div class="policy-cards">
						{#each data.rlsPolicies as policy}
							<div class="policy-card">
								<div class="policy-header">
									<span class="policy-name">{policy.policy_name}</span>
									<span class="policy-cmd">{policy.cmd}</span>
								</div>
								<code>{policy.definition ?? '(unrestricted)'}</code>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if data.rlsEnabled && data.rlsPolicies.length === 0}
				<div class="alert alert-warn">
					<strong>⚠️ No RLS policies found!</strong> The <code>posts</code> table has RLS enabled but no policies.
					<br>INSERT/UPDATE/DELETE via the anon key will silently fail. You need at least:
					<pre class="sql">CREATE POLICY "Allow insert for all" ON posts FOR INSERT WITH CHECK (true);</pre>
				</div>
			{/if}

			<!-- Schema Columns -->
			<div class="schema-section">
				<h2>Table Columns</h2>
				<div class="columns-table-wrapper">
					<table class="schema-table">
						<thead>
							<tr>
								<th>Column</th>
								<th>Type</th>
								<th>Nullable</th>
								<th>Default</th>
							</tr>
						</thead>
						<tbody>
							{#each data.columns as col}
								<tr>
									<td><code>{col.column_name}</code></td>
									<td>{col.data_type}</td>
									<td>{col.is_nullable}</td>
									<td><code>{col.column_default ?? 'NULL'}</code></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Sample Data -->
			{#if data.sampleRows && data.sampleRows.length > 0}
				<div class="schema-section">
					<h2>Sample Rows (last 5)</h2>
					<div class="rows-grid">
						{#each data.sampleRows as row, i}
							<div class="row-card">
								<div class="row-header">Row {i + 1}</div>
								<pre class="row-data">{JSON.stringify(row, null, 2)}</pre>
							</div>
						{/each}
					</div>
				</div>
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

	.info-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		background: #f9f9fb;
		border: 1px solid #e4e4e7;
		border-radius: 6px;
		padding: 1rem 1.5rem;
		margin-bottom: 2rem;
		font-size: 0.85rem;
	}

	.info-bar code {
		background: #eee;
		padding: 0.1em 0.3em;
		border-radius: 3px;
	}

	.schema-section {
		margin-bottom: 2rem;
	}

	.schema-section h2 {
		font-size: 1.1rem;
		margin-bottom: 1rem;
		color: var(--text-color);
	}

	.columns-table-wrapper {
		overflow-x: auto;
	}

	.schema-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.schema-table th,
	.schema-table td {
		padding: 0.6rem 1rem;
		text-align: left;
		border-bottom: 1px solid #e4e4e7;
	}

	.schema-table th {
		font-weight: 600;
		color: #444;
		background: #f9f9fb;
	}

	.schema-table td code {
		background: #f4f4f5;
		padding: 0.1em 0.4em;
		border-radius: 3px;
		font-size: 0.85rem;
	}

	.rows-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: 1rem;
	}

	.row-card {
		background: #f9f9fb;
		border: 1px solid #e4e4e7;
		border-radius: 6px;
		overflow: hidden;
	}

	.row-header {
		background: #f4f4f5;
		padding: 0.4rem 0.8rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: #666;
	}

	.row-data {
		margin: 0;
		padding: 0.8rem;
		font-size: 0.8rem;
		overflow-x: auto;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}

	.rls-section {
		margin-bottom: 2rem;
	}

	.rls-section h2 {
		font-size: 1.1rem;
		margin-bottom: 1rem;
		color: var(--text-color);
	}

	.policy-cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
		gap: 1rem;
	}

	.policy-card {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 6px;
		padding: 0.8rem;
	}

	.policy-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.policy-name {
		font-weight: 600;
		color: #166534;
	}

	.policy-cmd {
		background: #166534;
		color: white;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		font-size: 0.75rem;
	}

	.policy-card code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.8rem;
		word-break: break-all;
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

	.alert-warn {
		background: #fffbeb;
		border: 1px solid #fde68a;
		color: #92400e;
	}

	.alert pre.sql {
		background: #1e1e1e;
		color: #a5d6ff;
		padding: 0.8rem;
		border-radius: 4px;
		margin-top: 0.8rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.85rem;
		overflow-x: auto;
	}
</style>
