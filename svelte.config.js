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
			// For local development, we trust localhost. For production, this should be
			// set to your actual deployed domain(s) behind Cloudflare Tunnels
			trustedOrigins: ['http://localhost:*']
		}
	}
};

export default config;
