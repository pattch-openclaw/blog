<script lang="ts">
	let { slug } = $props();
	let isDeleting = $state(false);

	async function handleDelete() {
		if (!confirm(`Delete "${slug}"? This cannot be undone.`)) {
			return;
		}
		isDeleting = true;
		const res = await fetch('/admin/write', {
			method: 'POST',
			body: new FormData(Object.assign(new FormData(), [['slug', slug], ['action', 'delete']])),
		});
		isDeleting = false;
		if (res.ok) {
			window.location.href = '/blog';
		} else {
			alert('Failed to delete post');
		}
	}
</script>

<button class="btn-delete" onclick={handleDelete} disabled={isDeleting}>
	{isDeleting ? 'Deleting...' : '🗑️ Delete'}
</button>

<style>
	.btn-delete {
		background: #dc3545;
		color: #fff;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		text-decoration: none;
		transition: opacity 0.2s ease;
	}

	.btn-delete:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-delete:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
