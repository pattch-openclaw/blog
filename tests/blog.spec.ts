import { test, expect } from '@playwright/test';

test('blog list page has expected layout and styling', async ({ page }) => {
    // Mocking is handled server-side via CONTENT_STORE=test-mock in playwright.config.ts.
    // The globalSetup creates a TestMockPostStore that returns fake posts,
    // so the server renders with mock data instead of real git-based posts.

    // Navigate directly to /blog (bypasses svelte:head title not updating on client-side nav)
    await page.goto('/blog');

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

test('single mock blog post with AI author has expected layout', async ({ page }) => {
    await page.goto('/blog/mock-ai');
    
    await expect(page.locator('h1', { hasText: 'Mocked AI Post' })).toBeVisible();
    await expect(page.locator('.author-badge', { hasText: 'ai 🦞' })).toBeVisible();
    await expect(page).toHaveScreenshot('blog-post-mock-ai.png', { maxDiffPixels: 100, fullPage: true });
});

test('single draft blog post has expected layout', async ({ page }) => {
    // We cannot mock static markdown content without breaking Svelte's scoped CSS classes.
    // Instead, we perform visual regression on a real, stable draft post.
    await page.goto('/blog/secret-draft');
    
    await expect(page.locator('h1').last()).toContainText('Top Secret Draft');
    await expect(page.locator('.admin-actions')).toBeVisible();
    await expect(page).toHaveScreenshot('blog-post-draft.png', { maxDiffPixels: 100, fullPage: true });
});
