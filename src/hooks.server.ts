import { error, type Handle, type HandleServerError } from '@sveltejs/kit';
import { getPosts } from '$lib/server/posts';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/logging';

export const handle: Handle = async ({ event, resolve }) => {
	logger.info(`[${event.request.method}] ${event.url.pathname}`);

	// Block access to the admin console in production
	if (event.url.pathname.startsWith('/admin')) {
		if (env.SHOW_DRAFTS !== 'true') {
			logger.warn(`Admin blocked: SHOW_DRAFTS=${env.SHOW_DRAFTS}`);
			throw error(404, 'Not found');
		}
	}

	// If the user tries to access a specific blog post
	if (event.url.pathname.startsWith('/blog/') && event.url.pathname !== '/blog') {
		const slug = event.url.pathname.split('/')[2];
		
		if (slug) {
			const posts = await getPosts();
			const post = posts.find((p) => p.slug === slug);
			
			// If the post is marked as a draft and we aren't in the staging environment, block it
			if (post && !post.published && env.SHOW_DRAFTS !== 'true') {
				logger.warn(`Draft post hidden: ${slug}`);
				throw error(404, 'Post not found');
			}
		}
	}

	return resolve(event);
};

export const handleError: HandleServerError = ({ error: err, event }) => {
	logger.error(`[Global Error Hook] ${event ? `${event.request.method} ${event.url.pathname}` : 'unknown'}: ${err}`);

	return {
		message: err instanceof Error ? err.message : 'Internal Server Error',
		stack: err instanceof Error ? err.stack : undefined
	};
};
