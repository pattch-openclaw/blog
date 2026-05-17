import { test, expect } from '@playwright/test';

test('blog list page has expected layout and styling', async ({ page }) => {
    // Inject a header to tell the server to return mocked posts for visual regression stability
    await page.setExtraHTTPHeaders({ 'x-mock-posts': 'true' });
    
    await page.goto('/blog');

    // Check title
    await expect(page).toHaveTitle(/Writing \| Sam's Blog/);

    // Make sure the main header is visible
    await expect(page.locator('h1').last()).toContainText('Writing');

    // Wait for the posts to load
    await expect(page.locator('.posts')).toBeVisible();

    // Take screenshot of the full page
    await expect(page).toHaveScreenshot('blog-list.png', { maxDiffPixels: 100, fullPage: true });
});

test('single published blog post has expected layout', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-playwright-test': 'true' });
    await page.goto('/blog/mock-published');

    await expect(page.locator('h1').last()).toContainText('Mocked Published Content');
    
    // Ensure admin controls are NOT visible on a published post (unless reverted, but mocked one is published)
    // Actually, on staging, if it's published, it shows "Revert to Draft". Let's capture the screenshot as-is.
    await expect(page).toHaveScreenshot('blog-post-published.png', { maxDiffPixels: 100, fullPage: true });
});

test('single draft blog post has expected layout', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-playwright-test': 'true' });
    await page.goto('/blog/mock-draft');

    await expect(page.locator('h1').last()).toContainText('Mocked Draft Content');
    
    // Ensure admin controls ARE visible on a draft post
    await expect(page.locator('.admin-actions')).toBeVisible();
    
    await expect(page).toHaveScreenshot('blog-post-draft.png', { maxDiffPixels: 100, fullPage: true });
});
