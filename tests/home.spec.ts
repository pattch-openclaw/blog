import { test, expect } from '@playwright/test';

test('@screendiff homepage has expected title and structure', async ({ page }) => {
    // Start at a different page to force a client-side navigation to the home page
    await page.goto('/about');

    // Intercept network requests to /api/posts and return mock data
    await page.route('**/api/posts', async route => {
        const mockPosts = [
            { title: 'Mocked Recent Post 1', slug: 'mock-1', date: '2026-05-16T00:00:00Z', published: true, author: 'sam' },
            { title: 'Mocked Recent Post 2', slug: 'mock-2', date: '2026-05-15T00:00:00Z', published: true, author: 'ai' },
            { title: 'Mocked Recent Post 3', slug: 'mock-3', date: '2026-05-14T00:00:00Z', published: true, author: 'sam' }
        ];
        await route.fulfill({ json: mockPosts });
    });

    // Navigate client-side to trigger the mocked fetch
    await page.locator('header h1 a').click();
    await page.locator('header h1 a').blur();

    // Check title
    await expect(page).toHaveTitle(/Welcome \| Sam's Blog/);

    // Check the h2 heading
    await expect(page.locator('h2')).toContainText('Hi, I\'m Sam.');

    // Make sure the navigation is visible
    await expect(page.locator('nav a').first()).toBeVisible();

    // Check visual regression / screendiff test
    // Note: To update the baseline image when you make changes, run `npx playwright test --update-snapshots`
    await expect(page).toHaveScreenshot('homepage.png', { maxDiffPixels: 100 });
});

test('404 error page has a go back button', async ({ page }) => {
    // Navigating to a non-existent page
    const res = await page.goto('/this-page-does-not-exist');
    expect(res?.status()).toBe(404);

    // Verify error page structure
    await expect(page.locator('h1').last()).toContainText('404');
    await expect(page.locator('.back-link')).toBeVisible();
    await expect(page.locator('.home-link')).toBeVisible();
});
