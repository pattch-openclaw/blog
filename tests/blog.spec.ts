import { test, expect } from '@playwright/test';

test('blog list page has expected layout and styling', async ({ page }) => {
    // Mocking is handled server-side via CONTENT_STORE=test-mock in playwright.config.ts.
    // The globalSetup creates a TestMockPostStore that returns fake posts,
    // so the server renders with mock data instead of real git-based posts.

    // Navigate directly to /blog (bypasses svelte:head title not updating on client-side nav)
    await page.goto('/blog');

    // Check title
    await expect(page).toHaveTitle(/Writing \| Sam's Blog/);

    // Wait for the posts to load
    await expect(page.locator('.posts')).toBeVisible();

    // Take screenshot of the viewport
    await expect(page).toHaveScreenshot('blog-list.png', { maxDiffPixels: 100 });
});

test('single published blog post has expected layout', async ({ page }) => {
    // Uses TestMockPostStore via CONTENT_STORE=test-mock.
    await page.goto('/blog/mock-published');
    
    // Use role=heading to find the post title (not the layout header)
    await expect(page.getByRole('heading', { name: 'Mocked Published Post' }).first()).toBeVisible();
    await expect(page.locator('.author-badge', { hasText: 'sam' })).toBeVisible();
    await expect(page).toHaveScreenshot('blog-post-published.png', { maxDiffPixels: 5000, fullPage: true });
});

test('single mock blog post with AI author has expected layout', async ({ page }) => {
    await page.goto('/blog/mock-ai');
    
    await expect(page.getByRole('heading', { name: 'Mocked AI Post' }).first()).toBeVisible();
    await expect(page.locator('.author-badge', { hasText: 'ai 🦞' })).toBeVisible();
    await expect(page).toHaveScreenshot('blog-post-mock-ai.png', { maxDiffPixels: 5000, fullPage: true });
});

test('single draft blog post has expected layout', async ({ page }) => {
    await page.goto('/blog/secret-draft');
    
    await expect(page.getByRole('heading', { name: 'Top Secret Draft' }).first()).toBeVisible();
    await expect(page.locator('.admin-actions')).toBeVisible();
    await expect(page).toHaveScreenshot('blog-post-draft.png', { maxDiffPixels: 15000, fullPage: true });
});

test('blog list page has author filter pills', async ({ page }) => {
    await page.goto('/blog');
    
    // Author filter should be visible
    await expect(page.locator('.author-filter')).toBeVisible();
    
    // Should have pills for sam and ai
    await expect(page.locator('.author-pill', { hasText: 'sam' })).toHaveClass(/author-active/);
    await expect(page.locator('.author-pill', { hasText: 'ai' })).toHaveClass(/author-active/);
});

test('filtering by author hides posts', async ({ page }) => {
    await page.goto('/blog');
    
    // Initially see all posts (including sam's)
    await expect(page.locator('.posts li')).toHaveCount(6);
    
    // Click sam pill to toggle it off
    await page.locator('.author-pill', { hasText: 'sam' }).click();
    
    // Should now only see ai's posts
    await expect(page.locator('.posts li')).toHaveCount(2);
});

test('re-checking author shows their posts', async ({ page }) => {
    await page.goto('/blog');
    
    // Click ai pill to toggle it off
    await page.locator('.author-pill', { hasText: 'ai' }).click();
    
    // Should only see sam's posts
    await expect(page.locator('.posts li')).toHaveCount(4);
    
    // Click ai pill again to toggle it on
    await page.locator('.author-pill', { hasText: 'ai' }).click();
    
    // All posts visible again
    await expect(page.locator('.posts li')).toHaveCount(6);
});

test('unchecking all authors shows no posts', async ({ page }) => {
    await page.goto('/blog');
    
    // Click both pills to toggle them off
    await page.locator('.author-pill', { hasText: 'sam' }).click();
    await page.locator('.author-pill', { hasText: 'ai' }).click();
    
    // No posts visible
    await expect(page.locator('.no-posts')).toBeVisible();
});
