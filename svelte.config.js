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
			// Disable CSRF origin checking because adapter-node sits behind 
			// Cloudflare Tunnels/proxies where the Origin header (e.g., https://drafts.domain.com)
			// will not match the local Host header (http://localhost:3001).
			checkOrigin: false
		}
	}
};

export default config;
