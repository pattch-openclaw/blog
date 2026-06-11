<script lang="ts">
    let { data } = $props();

    function formatAppLog(log: typeof data.appLogs[0]): string {
        const ts = new Date(log.ts).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
        const level = log.level.toUpperCase().padStart(5);
        const op = log.op.padEnd(25);
        return `${ts} [${level}] ${op} ${log.message}${log.target ? ' → ' + log.target : ''}${log.context ? ' ' + JSON.stringify(log.context) : ''}`;
    }

    function formatLogs(raw: string): string {
        if (!raw) return 'No logs available.';
        // Strip ANSI escape codes (belt-and-suspenders with server-side strip)
        let text = raw.replace(/\x1b\[[0-9;]*m/g, '');
        // Highlight both ISO-8601 and PM2 bracketed timestamps
        // PM2 format: [2026-06-01 14:30:00.123]
        // ISO format:  2026-06-01T14:30:00.123Z
        text = text.replace(
            /(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\])/g,
            '<span class="ts">$1</span>'
        );
        text = text.replace(
            /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+[\+\-Z])/g,
            '<span class="ts">$1</span>'
        );
        return text;
    }
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
        <p class="subtitle">Recent logs for <strong>{data.appName}</strong> (CONTENT_STORE={data.store}).</p>

        <div class="logs-section">
            <div class="log-panel">
                <h3>Application Logs (Supabase & store ops)</h3>
                <pre class="log-viewer app-log-viewer" id="app-logs">{
                    data.appLogs.length > 0
                        ? data.appLogs.map(l => formatAppLog(l)).join('\n')
                        : 'No application-level log entries yet.'
                }</pre>
            </div>

            <div class="log-panel">
                <h3>Error Logs (PM2)</h3>
                <pre class="log-viewer error-log"><code>{formatLogs(data.logs.stderr)}</code></pre>
            </div>
            
            <div class="log-panel">
                <h3>Standard Logs (PM2)</h3>
                <pre class="log-viewer std-log"><code>{formatLogs(data.logs.stdout)}</code></pre>
            </div>

            <div class="log-panel">
                <h3>Secrets File Dump (.blog-secrets)</h3>
                <pre class="log-viewer secrets-dump"><code>{data.secretsDump}</code></pre>
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

    .secrets-dump {
        color: #569cd6;
        border: 1px solid #1a3a5c;
        background: #0d1b2a;
    }

    .app-log-viewer {
        color: #7ee787;
        border: 1px solid #0f3d0f;
        background: #0a1a0a;
    }
</style>
