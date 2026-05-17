import { test, expect } from '@playwright/test';

test('blog list page has expected layout and styling', async ({ page }) => {
    await page.goto('/blog');

    // Check title
    await expect(page).toHaveTitle(/Writing \| Sam's Blog/);

    // Make sure the main header is visible
    await expect(page.locator('h1').last()).toContainText('Writing');

    // Wait for the posts to load
    await expect(page.locator('.posts')).toBeVisible();

    // Dynamically mock the posts list so the screenshot diff is completely isolated
    // from whatever real posts exist in the production database/filesystem.
    await page.evaluate(() => {
        const postsList = document.querySelector('.posts');
        if (postsList) {
            postsList.innerHTML = `
                <li>
                    <div class="post-meta">
                        <span class="date">May 16, 2026</span>
                    </div>
                    <a class="title" href="/blog/mock-published">Mocked Published Post</a>
                    <p class="description">A published post for visual regression testing.</p>
                </li>
                <li class="is-draft">
                    <div class="post-meta">
                        <span class="date">May 15, 2026</span>
                        <span class="draft-badge">📝 Draft</span>
                    </div>
                    <a class="title" href="/blog/mock-draft">Mocked Draft Post</a>
                    <p class="description">A draft post for visual regression testing.</p>
                </li>
            `;
        }
    });

    // Take screenshot of the viewport
    await expect(page).toHaveScreenshot('blog-list.png', { maxDiffPixels: 100 });
});

test('single published blog post has expected layout', async ({ page }) => {
    // Navigate to a known existing published post
    await page.goto('/blog/hello-world');

    // Dynamically replace the post body to guarantee consistency regardless of what
    // real content edits are made to the post in the future.
    await page.evaluate(() => {
        const title = document.querySelector('h1');
        if (title) title.innerText = 'Mocked Published Content';
        
        const prose = document.querySelector('.prose');
        if (prose) {
            prose.innerHTML = `
                <p>This is a <strong>mocked published blog post</strong> used exclusively for Playwright visual regression testing.</p>
                <h2>Typography</h2>
                <p>Here is a paragraph with some <code>inline code</code>.</p>
                <blockquote>This is a blockquote.</blockquote>
                <pre><code>const test = "Hello World";</code></pre>
            `;
        }
    });

    await expect(page.locator('h1').last()).toContainText('Mocked Published Content');
    
    // Actually, on staging, if it's published, it shows "Revert to Draft". Let's capture the screenshot as-is.
    await expect(page).toHaveScreenshot('blog-post-published.png', { maxDiffPixels: 100, fullPage: true });
});

test('single draft blog post has expected layout', async ({ page }) => {
    // Navigate to a known existing draft post
    await page.goto('/blog/secret-draft');

    // Dynamically replace the post body to guarantee consistency regardless of what
    // real content edits are made to the post in the future.
    await page.evaluate(() => {
        const title = document.querySelector('h1');
        if (title) title.innerText = 'Mocked Draft Content';
        
        const prose = document.querySelector('.prose');
        if (prose) {
            prose.innerHTML = `
                <p>This is a <strong>mocked draft blog post</strong> used exclusively for Playwright visual regression testing.</p>
                <h2>Typography</h2>
                <p>Here is a paragraph with some <code>inline code</code>.</p>
                <blockquote>This is a blockquote.</blockquote>
                <pre><code>const test = "Hello World";</code></pre>
            `;
        }
    });

    await expect(page.locator('h1').last()).toContainText('Mocked Draft Content');
    
    // Ensure admin controls ARE visible on a draft post
    await expect(page.locator('.admin-actions')).toBeVisible();
    
    await expect(page).toHaveScreenshot('blog-post-draft.png', { maxDiffPixels: 100, fullPage: true });
});
