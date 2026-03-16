# Sam's Personal Blog

A simple, personal blog project built with SvelteKit.

## Overview
This repository contains the source code for my personal blog. It serves as a place to share thoughts, projects, and updates, leveraging SvelteKit for a fast and clean developer experience.

## Setup & Running Locally

1. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   *Note: In local dev, all drafts (`published: false`) will be visible because `SHOW_DRAFTS` evaluates to `true` by default when undefined in dev.*

3. Open `http://localhost:5173` in your browser.

## Testing Strategy

This repository relies on automated testing to ensure the blog's UI and markdown logic don't break during deployments. 

The stack includes:
* **Vitest**: Used for unit tests, parsing the Markdown frontmatter correctly, and checking data loaders.
* **Playwright**: Used for End-to-End (E2E) UI testing, validating the 404 pages, layout integrity, and Visual Regression (Screendiff) testing for the homepage.
* **Husky Git Hooks**: Automatically runs `npm run test` before every `git push`.
* **CI/CD Pipeline**: Tests run a second time securely on the home server. If any test fails on `main`, the deployment halts and PM2 is not reloaded.

### Running Tests
To manually run the test suite:
```bash
npm run test
```

### Approving Screendiff Changes
If you intentionally modify the visual design of the homepage, the pre-push hook will block your commit because the Playwright visual regression snapshot will mismatch.

To update the baseline snapshot to match your new changes, run:
```bash
npx playwright test --update-snapshots
```
Then, commit the updated snapshot file inside the `tests/` directory alongside your code.

## Self-Hosting Deployment Guide

This blog is configured to be self-hosted using `@sveltejs/adapter-node`, deployed via a GitHub Actions Self-Hosted Runner, managed by PM2, and served securely via Cloudflare Tunnels.

### The Dual-Environment Architecture
We run two lightweight production instances concurrently using PM2:
* **Production (`sams-blog-prod`)**: Runs on `Port 3000`. Environment variable `SHOW_DRAFTS=false`. Any markdown file with `published: false` in the frontmatter returns a 404.
* **Staging (`sams-blog-staging`)**: Runs on `Port 3001`. Environment variable `SHOW_DRAFTS=true`. Drafts are fully visible here to preview exactly how they look.

### Step 1: Set Up the GitHub Actions Self-Hosted Runner
1. Go to this repository on GitHub -> **Settings** -> **Actions** -> **Runners**.
2. Click **New self-hosted runner**.
3. Install the runner on your home server and run the installation as a background service: 
   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

### Step 2: Configure PM2
Once the runner pulls the code, PM2 will manage the SvelteKit node processes. Start the apps for the first time manually:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup # Follow the instructions it outputs to run PM2 on boot
```

### Step 3: Serve Externally with Cloudflare Tunnels
Cloudflare Tunnels expose your local PM2 services securely.

1. Create a tunnel in the Cloudflare Dashboard.
2. Route the Production traffic:
   - **Public Hostname**: `blog.yourdomain.com` 
   - **Service**: `http://localhost:3000`
3. Route the Staging traffic (Optional but recommended):
   - **Public Hostname**: `drafts.yourdomain.com` 
   - **Service**: `http://localhost:3001`
   - **Security**: Put this staging domain behind **Cloudflare Access** so only your authenticated email can view it!

Every time a commit is pushed to the `main` branch, the self-hosted runner will automatically rebuild the site and reload both PM2 instances seamlessly!
