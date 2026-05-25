import type { PostStore, Post } from './posts-store';

export class TestMockPostStore implements PostStore {
	private posts: Post[] = [
		{ title: 'Mocked Published Post', slug: 'mock-published', date: '2026-05-16T00:00:00Z', description: 'A published post for visual regression testing.', published: true, author: 'sam', tags: [], content: '## Mocked Published Post\n\nThis is the content of the mocked published post for visual regression testing.' },
		{ title: 'Mocked Published Post 2', slug: 'mock-published-2', date: '2026-05-15T00:00:00Z', description: 'Another published post by sam.', published: true, author: 'sam', tags: ['test'], content: '## Mocked Published Post 2\n\nThis is another post by sam.' },
		{ title: 'Mocked AI Post', slug: 'mock-ai', date: '2026-05-14T00:00:00Z', description: 'A post written by an LLM for testing.', published: true, author: 'ai', tags: ['ai', 'test'], content: '## Mocked AI Post\n\nThis is the content of the AI-authored mocked post for visual regression testing.' },
		{ title: 'Mocked AI Post 2', slug: 'mock-ai-2', date: '2026-05-13T00:00:00Z', description: 'Another AI post for filtering tests.', published: true, author: 'ai', tags: ['ai'], content: '## Mocked AI Post 2\n\nAnother AI post.' },
		{ title: 'Mocked Draft Post', slug: 'mock-draft', date: '2026-05-15T00:00:00Z', description: 'A draft post for visual regression testing.', published: false, author: 'sam', tags: [], content: '## Mocked Draft Post\n\nThis is a draft post for testing admin controls.' },
		// Includes a real draft post so the draft-page admin controls test can resolve it
		{ title: 'Top Secret Draft: Why AI is taking over', slug: 'secret-draft', date: '2026-03-15', description: 'You should not see this on the live site!', published: false, author: 'sam', tags: [], content: '## Top Secret Draft\n\nYou should not see this on the live site!' }
	];

	async listPosts(): Promise<Post[]> {
		return this.posts;
	}

	async getPost(slug: string): Promise<Post | null> {
		return this.posts.find(p => p.slug === slug) || null;
	}

	async savePost(post: Omit<Post, 'date' | 'published'>): Promise<Post> {
		return post as Post;
	}

	async updatePost(slug: string, updates: Partial<Pick<Post, 'title' | 'description' | 'content' | 'published' | 'author' | 'tags'>>): Promise<Post> {
		return { ...(this.posts.find(p => p.slug === slug) || {}), ...updates } as Post;
	}

	async deletePost(slug: string): Promise<void> {}
}
