import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md', '.svx'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md', '.svx']
		})
	],

	kit: {
		adapter: adapter(),
		csrf: {
			// Use trustedOrigins instead of deprecated checkOrigin
			// For local development, we trust localhost. For staging/production,
			// we trust theSTS domains behind Cloudflare Tunnels
			trustedOrigins: ['http://localhost:*', 'https://sts.dev', 'https://www.sts.dev', 'https://staging.sts.dev', 'https://sandbox.sts.dev']
		}
	}
};

export default config;
