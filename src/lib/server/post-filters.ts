import type { Post } from '$lib/types';

/**
 * Filter posts by active tag and active author filters.
 * Used by the blog list page for client-side filtering.
 *
 * @param posts - The full list of posts to filter
 * @param activeTag - Current tag filter (empty string = no tag filter)
 * @param authorFilters - Record of author -> selected state
 * @returns Filtered posts
 */
export function filterPosts(
	posts: Post[],
	activeTag: string,
	authorFilters: Record<string, boolean>
): Post[] {
	let result = posts;

	// Apply tag filter
	if (activeTag) {
		result = result.filter((p: Post) => p.tags.includes(activeTag));
	}

	// Apply author filters — always filter if we have author definitions
	if (Object.keys(authorFilters).length > 0) {
		const selectedAuthors = new Set(
			Object.entries(authorFilters)
				.filter(([, active]) => active)
				.map(([author]) => author)
		);
		result = result.filter((p: Post) => selectedAuthors.has(p.author));
	}

	return result;
}
