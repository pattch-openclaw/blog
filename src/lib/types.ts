export type Post = {
	title: string;
	slug: string;
	description: string;
	date: string;
	published: boolean;
	author: string; // canonical values: 'sam' or 'ai'; custom strings supported
	tags: string[]; // case-normalized to lowercase
	content: string; // raw markdown content (included when fetching a single post)
};
