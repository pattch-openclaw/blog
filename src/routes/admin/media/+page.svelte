<script lang="ts">
    import { enhance } from '$app/forms';
    let { form } = $props();
    let uploading = $state(false);
</script>

<svelte:head>
    <title>Upload Media | Admin Dashboard</title>
</svelte:head>

<div class="admin-container">
    <div class="header">
        <a href="/admin" class="back-link">← Back to Dashboard</a>
        <h1>Upload Media</h1>
    </div>

    {#if form?.success}
        <div class="alert success">
            File uploaded successfully! 
            <br>
            <strong>Path:</strong> <code>{form.path}</code>
            <br>
            <p>You can use this image in markdown like this:</p>
            <code>![Alt Text]({form.path})</code>
        </div>
    {/if}

    {#if form?.error}
        <div class="alert error">
            <h3>{form.error}</h3>
            {#if form.details}
                <p><strong>Details:</strong> {form.details}</p>
            {/if}
            {#if form.stdout}
                <div class="code-block">
                    <strong>Standard Output:</strong>
                    <pre><code>{form.stdout}</code></pre>
                </div>
            {/if}
            {#if form.stderr}
                <div class="code-block">
                    <strong>Standard Error:</strong>
                    <pre><code>{form.stderr}</code></pre>
                </div>
            {/if}
        </div>
    {/if}

    <form method="POST" action="?/upload" enctype="multipart/form-data" use:enhance={() => {
        uploading = true;
        return async ({ update }) => {
            uploading = false;
            await update();
        };
    }}>
        <div class="form-group">
            <label for="type">Media Type</label>
            <select name="type" id="type" required>
                <option value="images">Image</option>
                <option value="audio">Audio</option>
                <option value="fonts">Font</option>
            </select>
        </div>

        <div class="form-group">
            <label for="file">File</label>
            <input type="file" name="file" id="file" required accept="image/*,audio/*,.woff,.woff2,.ttf" />
        </div>

        <button type="submit" disabled={uploading} class="btn-submit">
            {uploading ? 'Uploading & Committing...' : 'Upload File'}
        </button>
    </form>
</div>

<style>
    .admin-container {
        max-width: 800px;
        margin: 0 auto;
        padding-top: 2rem;
    }

    .header {
        margin-bottom: 2rem;
    }

    .back-link {
        display: inline-block;
        margin-bottom: 1rem;
        color: #666;
        text-decoration: none;
    }

    .back-link:hover {
        color: var(--link-color);
        text-decoration: underline;
    }

    h1 {
        margin: 0;
    }

    .alert {
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 2rem;
    }

    .alert.success {
        background-color: rgba(0, 128, 0, 0.1);
        border: 1px solid rgba(0, 128, 0, 0.2);
        color: #006600;
    }

    @media (prefers-color-scheme: dark) {
        .alert.success {
            background-color: rgba(0, 255, 0, 0.1);
            color: #4ade80;
        }
    }

    .alert.error {
        background-color: rgba(255, 0, 0, 0.1);
        border: 1px solid rgba(255, 0, 0, 0.2);
        color: #cc0000;
    }

    @media (prefers-color-scheme: dark) {
        .alert.error {
            background-color: rgba(255, 0, 0, 0.2);
            color: #ffb3b3;
        }
    }

    .alert code {
        display: inline-block;
        margin-top: 0.5rem;
        background: rgba(0, 0, 0, 0.1);
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
    }

    .code-block {
        margin-top: 1rem;
    }

    .code-block pre {
        background: rgba(0, 0, 0, 0.15);
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
        margin-top: 0.5rem;
    }

    .code-block pre code {
        display: block;
        background: none;
        padding: 0;
        margin: 0;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        background: rgba(128, 128, 128, 0.05);
        padding: 2rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    label {
        font-weight: 600;
    }

    input, select {
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-family: inherit;
        background-color: var(--bg-color);
        color: var(--text-color);
    }

    .btn-submit {
        background-color: var(--link-color);
        color: white;
        border: none;
        padding: 1rem;
        border-radius: 6px;
        font-weight: bold;
        font-size: 1rem;
        cursor: pointer;
        transition: opacity 0.2s;
        margin-top: 1rem;
    }

    .btn-submit:hover:not(:disabled) {
        opacity: 0.9;
    }

    .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>