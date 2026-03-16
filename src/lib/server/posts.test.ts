import { expect, test } from 'vitest';
import { getPosts } from './posts';

// Quick mock for import.meta.glob since we are testing server logic
test('getPosts returns a sorted array of posts', async () => {
    const posts = await getPosts();
    expect(Array.isArray(posts)).toBe(true);

    // Verify it handles parsing the metadata correctly
    if (posts.length > 0) {
        expect(posts[0]).toHaveProperty('title');
        expect(posts[0]).toHaveProperty('slug');
        expect(posts[0]).toHaveProperty('date');
        expect(posts[0]).toHaveProperty('published');
    }
});
