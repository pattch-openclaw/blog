import { env } from '$env/dynamic/private';

export function load() {
	return {
		showAdmin: env.SHOW_DRAFTS === 'true'
	};
}
