<script lang="ts">
    import { enhance } from '$app/forms';
    let { form, data } = $props();
    let uploading = $state(false);
    let selectedImage = $state(null);
    let selectedImageId = $state<string | null>(null);
    let deleting = $state(false);</script>

<svelte:head>
    <title>Manage Media | Admin Dashboard</title>
</svelte:head>

<div class="admin-container">
    <div class="header">
        <a href="/admin" class="back-link">← Back to Dashboard</a>
        <h1>Manage Media</h1>
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
                <p><strong>Details:</strong></p>
                <pre class="error-details"><code>{form.details}</code></pre>
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

    {#if data.images.length > 0}
        <div class="gallery-section">
            <h2 class="gallery-title">Uploaded Images ({data.images.length})</h2>
            <div class="gallery">
                {#each data.images as image}
                    <button class="gallery-item {selectedImage === image.path ? 'selected' : ''}" type="button" onclick={() => { selectedImage = image.path; selectedImageId = image.id; }}>
                        <img src={image.path} alt={image.name} loading="lazy" />
                        <span class="gallery-name" title={image.name}>{image.name}</span>
                    </button>
                {/each}
            </div>
            {#if selectedImage}
                <div class="selection-info">
                    <span class="info-path">{selectedImage}</span>
                    <button class="btn-copy" onclick={() => { navigator.clipboard.writeText(`![${selectedImage.split('/').pop()}](${selectedImage})`); selectedImage = null; selectedImageId = null; }}>Copy Markdown</button>
                    {#if !deleting}
                        <button class="btn-delete" onclick={() => deleting = true}>Delete</button>
                    {/if}
                    {#if deleting}
                        <div class="delete-confirm">
                            <span>Really delete this file?</span>
                            <button class="btn-confirm-delete" onclick={async () => {
                                deleting = false;
                                const fd = new FormData();
                                fd.append('id', selectedImageId);
                                const res = await fetch('?/delete', { method: 'POST', body: fd });
                                if (res.ok) {
                                    window.location.reload();
                                }
                            }}>Yes, Delete</button>
                            <button class="btn-cancel-delete" onclick={() => deleting = false}>Cancel</button>
                        </div>
                    {/if}
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
        <p class="form-hint">Browse files below or upload new media:</p>
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
            {uploading ? 'Uploading & Committing...' : 'Browse & Upload'}
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

    .form-hint {
        color: #666;
        margin-bottom: 1rem;
    }

    .gallery-section {
        margin-bottom: 2rem;
    }

    .gallery-title {
        font-size: 1.1rem;
        color: #444;
        margin-bottom: 1rem;
    }

    .gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 0.75rem;
    }

    .gallery-item {
        border-radius: 6px;
        border: 2px solid transparent;
        overflow: hidden;
        transition: border-color 0.2s, box-shadow 0.2s;
        background: none;
        padding: 0;
        margin: 0;
        cursor: pointer;
    }

    .gallery-item:hover {
        border-color: var(--link-color);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .gallery-item.selected {
        border-color: var(--link-color);
        box-shadow: 0 0 0 2px var(--link-color);
    }

    .gallery-item img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        display: block;
    }

    .gallery-name {
        display: block;
        font-size: 0.7rem;
        padding: 0.3rem 0.4rem;
        background: rgba(0, 0, 0, 0.03);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
        color: #555;
    }

    .selection-info {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: rgba(0, 100, 255, 0.05);
        border: 1px solid rgba(0, 100, 255, 0.2);
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .info-path {
        font-family: monospace;
        font-size: 0.85rem;
        color: #333;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .btn-copy {
        padding: 0.4rem 0.8rem;
        background: var(--link-color);
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .btn-copy:hover {
        opacity: 0.9;
    }

    .btn-delete {
        padding: 0.4rem 0.8rem;
        background: #d32f2f;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .btn-delete:hover {
        opacity: 0.9;
    }

    .delete-confirm {
        width: 100%;
        margin-top: 0.75rem;
        padding: 0.75rem;
        background: rgba(211, 47, 47, 0.08);
        border: 1px solid rgba(211, 47, 47, 0.3);
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .delete-confirm span {
        font-size: 0.85rem;
        color: #c62828;
        font-weight: 500;
    }

    .btn-confirm-delete {
        padding: 0.35rem 0.75rem;
        background: #d32f2f;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
        flex-shrink: 0;
    }

    .btn-confirm-delete:hover {
        opacity: 0.9;
    }

    .btn-cancel-delete {
        padding: 0.35rem 0.75rem;
        background: transparent;
        color: #666;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
        flex-shrink: 0;
    }

    .btn-cancel-delete:hover {
        border-color: #999;
        color: #333;
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

    .error-details {
        background: rgba(0, 0, 0, 0.15);
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
        white-space: pre-wrap;
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