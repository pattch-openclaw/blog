import { test, expect } from '@playwright/test';

test('homepage has expected title and structure', async ({ page }) => {
    await page.goto('/');

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
