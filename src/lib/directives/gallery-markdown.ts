/**
 * Generates `:::gallery` directive markdown from a set of selected images.
 * Used by the /admin/write gallery builder; kept pure so it is unit-testable.
 */

export interface GallerySourceImage {
	filename: string;
	public_url: string;
}

/**
 * Build the gallery directive block for the selected images, in the given order.
 * Returns '' for an empty selection so the UI can hide the copy affordance.
 */
export function buildGalleryMarkdown(images: GallerySourceImage[]): string {
	if (images.length === 0) return '';
	const lines = images.map((img) => `![${img.filename}](${img.public_url})`);
	return `:::gallery\n${lines.join('\n')}\n:::\n`;
}
