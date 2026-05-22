export type Post = {
	title: string;
	slug: string;
	description: string;
	date: string;
	published: boolean;
	content: string; // raw markdown content (included when fetching a single post)
};
