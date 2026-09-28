/**
 * Pure helpers for media folder paths ('images/trips/2026/photo.png').
 * Shared between the server (upload sanitization) and the admin client
 * (folder-tree splitting), so it must stay dependency-free.
 */

/**
 * Sanitize a user-supplied folder prefix within a bucket.
 * Keeps safe segments of [a-zA-Z0-9._-]; resolves '.' and '..' like a path
 * (pop the parent, never escaping the bucket root).
 * 'trips/2026/' -> 'trips/2026'; 'a/../b' -> 'b'; '' -> '' (bucket root).
 */
export function sanitizeMediaFolder(raw: string): string {
	const stack: string[] = [];
	for (const seg of raw.split('/')) {
		const clean = seg.trim().replace(/[^a-zA-Z0-9.\-_]/g, '_');
		if (clean === '' || clean === '.') continue;
		if (clean === '..') {
			stack.pop();
			continue;
		}
		stack.push(clean);
	}
	return stack.join('/');
}

/**
 * Normalize a MediaEntry.path to a bucket-relative path.
 * Handles both store shapes: Supabase ('images/trips/x.png') and
 * git ('media/images/trips/x.png').
 */
export function bucketRelPath(entryPath: string, bucket: string): string {
	let p = entryPath.startsWith('media/') ? entryPath.slice('media/'.length) : entryPath;
	const prefix = `${bucket}/`;
	if (p.startsWith(prefix)) p = p.slice(prefix.length);
	return p;
}

/** An image file entry as delivered to the admin folder-tree client. */
export interface LazyImage {
	id: string;
	/** Basename */
	name: string;
	/** Public URL */
	path: string;
	/** Signed/preview URL (falls back to public URL) */
	preview_url: string;
}

/**
 * Directory portion of an entry path relative to its bucket
 * ('trips/2026/photo.png' -> 'trips/2026'; 'photo.png' -> '').
 */
export function dirOf(relPath: string): string {
	const idx = relPath.lastIndexOf('/');
	return idx === -1 ? '' : relPath.slice(0, idx);
}

/** Filename portion of an entry path relative to its bucket. */
export function baseOf(relPath: string): string {
	return relPath.slice(relPath.lastIndexOf('/') + 1);
}

/** A node in the bucket-relative folder tree. */
export interface FolderNodeData {
	/** Directory path relative to the bucket ('' for the bucket root) */
	dir: string;
	/** Display name ('(root)' style labels are added by the UI) */
	name: string;
	/** Immediate subfolders */
	folders: FolderNodeData[];
	/** Immediate files (paths relative to the bucket) */
	files: string[];
	/** Number of files anywhere below this node, including direct files */
	total: number;
}

/**
 * Build a sorted folder tree from bucket-relative image paths.
 * Every directory that appears in any path becomes a node, so folders
 * with only subfolders (no direct files) still render.
 */
export function buildFolderTree(relPaths: string[]): FolderNodeData {
	const root: FolderNodeData = { dir: '', name: '', folders: [], files: [], total: 0 };
	const nodes = new Map<string, FolderNodeData>([[root.dir, root]]);

	const ensureNode = (dir: string): FolderNodeData => {
		const existing = nodes.get(dir);
		if (existing) return existing;
		const node: FolderNodeData = { dir, name: baseOf(dir), folders: [], files: [], total: 0 };
		nodes.set(dir, node);
		const parent = ensureNode(dirOf(dir));
		parent.folders.push(node);
		return node;
	};

	for (const rel of relPaths) {
		const dir = dirOf(rel);
		const node = ensureNode(dir);
		node.files.push(rel);
		let current: FolderNodeData | null = node;
		while (current) {
			current.total += 1;
			const parentDir = dirOf(current.dir);
			current = current.dir === '' ? null : (nodes.get(parentDir) ?? null);
		}
	}

	const sortTree = (node: FolderNodeData): void => {
		node.files.sort((a, b) => baseOf(a).localeCompare(baseOf(b)));
		node.folders.sort((a, b) => a.name.localeCompare(b.name));
		node.folders.forEach(sortTree);
	};
	sortTree(root);

	return root;
}
