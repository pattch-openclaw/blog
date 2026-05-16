<script lang="ts">
    let { data } = $props();
</script>

<svelte:head>
    <title>System Logs | Admin</title>
</svelte:head>

<div class="admin-container wide-layout">
    <div class="admin-main">
        <nav class="admin-nav">
            <a href="/admin">← Back to Admin</a>
        </nav>
        
        <h1>System Logs</h1>
        <p class="subtitle">Recent PM2 logs for the staging environment.</p>

        <div class="logs-section">
            <div class="log-panel">
                <h3>Error Logs</h3>
                <pre class="log-viewer error-log"><code>{data.logs.stderr || 'No recent errors.'}</code></pre>
            </div>
            
            <div class="log-panel">
                <h3>Standard Logs</h3>
                <pre class="log-viewer std-log"><code>{data.logs.stdout || 'No recent output.'}</code></pre>
            </div>
        </div>
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

    .logs-section {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .log-panel {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .log-panel h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--text-color);
    }

    .log-viewer {
        background: #1e1e1e;
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.85rem;
        line-height: 1.4;
        max-height: 600px;
        overflow-y: auto;
    }

    .error-log {
        color: #ffb3b3;
        border: 1px solid #4a0000;
    }

    .std-log {
        color: #d4d4d4;
        border: 1px solid #333;
    }
</style>