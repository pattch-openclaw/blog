import { test, expect } from '@playwright/test';

test('blog list page has expected layout and styling', async ({ page }) => {
    // Start at a different page to force a client-side navigation to the blog list
    await page.goto('/about');

    // Intercept network requests to /api/posts and return mock data
    await page.route('**/api/posts', async route => {
        const mockPosts = [
            { title: 'Mocked Published Post', slug: 'mock-published', date: '2026-05-16T00:00:00Z', description: 'A published post for visual regression testing.', published: true },
            { title: 'Mocked Draft Post', slug: 'mock-draft', date: '2026-05-15T00:00:00Z', description: 'A draft post for visual regression testing.', published: false }
        ];
        await route.fulfill({ json: mockPosts });
    });

    // Navigate client-side to trigger the mocked fetch
    await page.locator('nav a[href="/blog"]').click();
    await page.locator('nav a[href="/blog"]').blur(); // Remove focus ring to prevent visual diff

    // Check title
    await expect(page).toHaveTitle(/Writing \| Sam's Blog/);

    // Make sure the main header is visible
    await expect(page.locator('h1', { hasText: 'Writing' })).toBeVisible();

    // Wait for the posts to load
    await expect(page.locator('.posts')).toBeVisible();

    // Take screenshot of the viewport
    await expect(page).toHaveScreenshot('blog-list.png', { maxDiffPixels: 100 });
});

test('single published blog post has expected layout', async ({ page }) => {
    // We cannot mock static markdown content without breaking Svelte's scoped CSS classes.
    // Instead, we perform visual regression on a real, stable published post.
    await page.goto('/blog/hello-world');
    
    await expect(page.locator('h1').last()).toContainText('Hello World');
    await expect(page).toHaveScreenshot('blog-post-published.png', { maxDiffPixels: 100, fullPage: true });
});

test('single draft blog post has expected layout', async ({ page }) => {
    // We cannot mock static markdown content without breaking Svelte's scoped CSS classes.
    // Instead, we perform visual regression on a real, stable draft post.
    await page.goto('/blog/secret-draft');
    
    await expect(page.locator('h1').last()).toContainText('Top Secret Draft');
    await expect(page.locator('.admin-actions')).toBeVisible();
    await expect(page).toHaveScreenshot('blog-post-draft.png', { maxDiffPixels: 100, fullPage: true });
});
