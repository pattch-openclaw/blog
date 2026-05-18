export interface MediaImage {
    name: string;
    path: string;
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

/**
 * Determine if a filename is a valid image extension.
 */
export function isImageFile(filename: string): boolean {
    const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
    return IMAGE_EXTS.has(ext);
}

/**
 * Filter a directory entry list to only image files.
 * This is the core filtering logic used by the media gallery `load` function.
 */
export function filterImages(
    entries: Array<{ name: string; isFile: () => boolean }>
): MediaImage[] {
    return entries
        .filter(e => e.isFile() && isImageFile(e.name))
        .map(e => ({
            name: e.name,
            path: `/media/images/${e.name}`,
        }))
        .sort((a, b) => b.name.localeCompare(a.name));
}

/**
 * Validate that a file path is safe for deletion (must start with /media/images/).
 * Returns the sanitized filename, or null if the path is unsafe.
 */
export function sanitizeDeletePath(filePath: string): string | null {
    if (!filePath.startsWith('/media/images/')) {
        return null;
    }
    return filePath.split('/').pop() ?? null;
}

/**
 * Build the expected git commit message for a delete operation.
 */
export function buildDeleteCommitMessage(filename: string): string {
    return `media: delete ${filename}`;
}

/**
 * Build the expected git rm path for a file at /media/images/<name>.
 */
export function buildGitRmPath(filename: string): string {
    return `media/images/${filename}`;
}
