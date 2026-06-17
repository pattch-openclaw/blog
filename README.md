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
* **Husky Git Hooks**: Automatically runs the full test suite (`npm run test` — both Vitest unit + all Playwright E2E including screendiff) before every `git push`.
* **CI/CD Pipeline**: Runs unit tests and non-screendiff E2E tests on the home server before deploying. If any test fails on `main`, the deployment halts and PM2 is not reloaded.

### Running Tests
To manually run the full test suite (including screendiff):
```bash
npm run test
```

To run only non-screendiff E2E tests (CI behavior):
```bash
npx playwright test --grep-invert '@screendiff'
```

### Screendiff Tests at Pre-Commit
Screendiff (visual regression) tests run at pre-commit time, ensuring visual regressions are caught before they reach the repository. This keeps screendiff coverage without blocking deployment — removing them from the CI pipeline prevents deployment failures caused by harmless screendiff drift (e.g., OS-level font rendering differences between the developer's machine and the CI runner).

To update the screendiff baseline when you intentionally change the visual design, run:
```bash
npx playwright test --update-snapshots
```
Commit the updated snapshot file inside the `tests/` directory alongside your code.

## Self-Hosting Deployment Guide

This blog is configured to be self-hosted using `@sveltejs/adapter-node`, deployed via a GitHub Actions Self-Hosted Runner, managed by PM2, and served securely via Cloudflare Tunnels.

### The Three-Environment Architecture
We run three lightweight instances concurrently using PM2. All three read `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the same `.blog-secrets` file at startup — the secrets are shared across all environments.

* **Production (`sams-blog-prod`)**: Runs on `Port 3000`. `NODE_ENV=production`, `SHOW_DRAFTS=false`. Serves end users on the public internet. No admin pages visible. Uses `CONTENT_STORE=git` (default).
* **Staging (`sams-blog-staging`)**: Runs on `Port 3001`. `NODE_ENV=production`, `SHOW_DRAFTS=true`. Includes admin pages + draft posts visible. Behind Cloudflare Access login — not public. Uses `CONTENT_STORE=git` (default).
* **Sandbox (`sams-blog-sandbox`)**: Runs on `Port 3002`. `NODE_ENV=production`, `SHOW_DRAFTS=true`, `CONTENT_STORE=supabase`. Includes admin pages + draft posts visible. Behind Cloudflare Access login — not public. Uses the Supabase datastore (not git-based content). For testing the Supabase-backed content layer.

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

### Manual Service Restoration After Power Cycle

To manually restore all services after a power cycle or server restart:

```bash
# Restore PM2 processes from saved state
pm2 resurrect

# Start the GitHub Actions self-hosted runner
./svc.sh start
```

The `pm2 resurrect` command restores all three blog instances (`sams-blog-prod`, `sams-blog-staging`, `sams-blog-sandbox`) from the saved state. Verify with `pm2 status`.

To update secrets after changing `.blog-secrets`:
```bash
pm2 restart sams-blog-prod
pm2 restart sams-blog-staging
pm2 restart sams-blog-sandbox
```

### Step 3: Serve Externally with Cloudflare Tunnels
Cloudflare Tunnels expose your local PM2 services securely.

1. Create a tunnel in the Cloudflare Dashboard.
2. Route the Production traffic:
   - **Public Hostname**: `blog.yourdomain.com` 
   - **Service**: `http://localhost:3000`
3. Route the Sandbox traffic (Optional but recommended):
   - **Public Hostname**: `sandbox.yourdomain.com`
   - **Service**: `http://localhost:3002`
   - **Security**: Put this sandbox domain behind **Cloudflare Access** so only your authenticated email can view it!

Every time a commit is pushed to the `main` branch, the self-hosted runner will automatically rebuild the site and reload all three PM2 instances seamlessly!

---

# Project Notes

## Completed Features (as of 2026-06-16)
- **Rich markdown editor with live preview:** The `/admin/write` page now uses TipTap (ProseMirror-based editor) with live preview panel. Supports rich formatting, code blocks, and markdown export. The editor persists state in local storage and handles SvelteKit form actions via `use:enhance`.
- **Image picker on write page:** The `/admin/write` editor has an "Insert Image" dropdown that lists all images from `/media/images/`. Selecting one shows a preview thumbnail, generates the markdown `![alt](/media/images/{filename})`, and provides a copy button. The write page loads the image list server-side in `+page.server.ts`.
- **Unified media management page:** `/admin/media` provides a gallery view of all uploaded images with thumbnails in a responsive grid. Supports uploading (images/audio/fonts), browsing, and deleting. Upload form lets you pick media type and file; deletes require confirmation. After upload, success alerts display the file path and suggested markdown syntax. Delete action is POST to `?/delete` with file path, removes from filesystem + git index, commits + pushes.
- **Supabase Media Store:** When `CONTENT_STORE=supabase`, the `/admin/media` page now uses the `SupabaseMediaStore` backend for all media operations. Media is stored in Supabase Storage buckets (`images`, `audio`, `fonts`) and tracked in the `media_entries` Postgres table. The filesystem store (`FileSystemMediaStore`) is used when `CONTENT_STORE=git` (default). Both implementations are swappable via the `MediaStore` interface.
- **Legacy media utilities removed:** The old filesystem-specific helper functions in `src/lib/server/media.ts` have been removed since `FileSystemMediaStore` implements its own internal logic.

**2026-06-11 improvements to Supabase Media Store:**
- **Media Entries table is optional for unlinked uploads:** When uploading media on `/admin/media` (not attached to a blog post), the `post_id` field in `media_entries` is set to `null`. This allows storing media without requiring a blog post to be linked first.
- **Simplified delete flow:** The `/admin/media` delete action now uses entry IDs instead of file paths, making it backend-agnostic (no path parsing needed).
- **Archived legacy media utilities:** The old filesystem-specific helper functions in `src/lib/server/media.ts` have been archived since `FileSystemMediaStore` implements its own internal logic.
- **Bucket organization:** Media is now grouped by type (images/audio/fonts) in the UI and stored in corresponding Supabase Storage buckets.
- **Image deletion:** Available on `/admin/media` — select a gallery item, click Delete, confirm. Removes the file from disk and via `git rm --cached`, commits with `--no-verify`, pushes to origin/main.

## Post Metadata: Author + Tags (2026-05-22)

**Frontmatter format:**
```yaml
author: sam           # defaults to "sam" if missing (backward compat)
tags:                 # YAML array or comma-separated, empty if missing
  - sveltekit
  - webdev
```

**Canonical author values:** `"sam"` | `"ai"` (custom strings also supported). No emoji in canonical value — emoji reserved for UI display only (`ai 🦞` on admin pages).

**Implementation status:**

- ✅ `Post` type updated with `author` + `tags` fields
- ✅ `GitPostStore` parses and writes `author`/`tags` in frontmatter (missing fields default safely)
- ✅ `PostStore` interface updated with `author`/`tags` in `savePost` + `updatePost` signatures
- ✅ `getAllTags()` utility added to aggregate global tag pool
- ✅ Admin write page (`/admin/write`): author dropdown (sam / ai / custom), tag input with autocomplete from existing tags
- ✅ Blog listing (`/blog`): tag cloud with counts, clickable tag pills for filtering (`/blog?tag=xxx`), author badge on each post card
- ✅ Tag detail route (`/blog/tag/[tag]`): shows only posts with that tag
- ✅ Existing posts parse without `author`/`tags` (default to `"sam"` / `[]`)
- ✅ Supabase `SupabasePostStore` handles `author`/`tags` — implemented and verified

## Long-Term Goals

### Architectural Improvements (Higher Priority)
- **Separate Sandbox DB from Staging/Prod** — Currently Sandbox, Staging, and Prod all share the same Supabase database. The goal is to have a dedicated database for Sandbox while Staging and Prod share another (to save costs). This would provide cleaner isolation during testing.
- **SQLite Implementation** — Add a SQLite-backed datastore as an alternative to Supabase. This would allow local development without external dependencies and make the project more portable.

### Feature Development (Current Priority)

**Writing & Content Management UX:**
- Rich markdown editor improvements
- Better image/media embedding workflow
- Post scheduling UI
- Draft versioning

**Blog Site Features:**
- Syntax highlighting for code blocks
- Comment system integration (giscus/disqus)
- SEO improvements (meta tags, sitemaps, Open Graph/Twitter cards)
- Tag and author filtering enhancements
- Search functionality
- Analytics / view counts

> **Note:** The architectural goals above are not currently prioritized. Feature development for writing UX and blog site functionality takes precedence until the core experience is solidified.

## Architecture Notes

### Current Architecture

**Blog posts and media:** Stored in Supabase Postgres (`posts` table with markdown content, `media_entries` table for media metadata). Media files stored in Supabase Storage buckets (`images`, `audio`, `fonts`).

**Runtime behavior:** The blog reads from Supabase when `CONTENT_STORE=supabase` (sandbox environment), or falls back to git-based content when `CONTENT_STORE=git` (production/staging environments).

### Supabase Integration

The blog is configured to use Supabase for content storage:

- **Database:** Postgres tables (`posts`, `media_entries`) with RLS enabled
- **Storage:** Buckets for `images`, `audio`, `fonts`
- **Environment:** Sandbox (`CONTENT_STORE=supabase`) uses Supabase; production/staging (`CONTENT_STORE=git`) use git-based content

See the source code for implementation details in `src/lib/server/*-store.ts`.

## Lessons Learned
- **Visual Regression Flakiness:** Playwright visual regression tests are highly sensitive to active UI states. A simple `locator.click()` can leave a focus ring that fails screenshot diffs; appending `.blur()` immediately resolves this.
- **Mocking SvelteKit SSR:** Replacing HTML content directly in Playwright via `route.fulfill({ body: html.replace(...) })` strips out SvelteKit's dynamically generated scoped CSS classes (e.g., `svelte-1x4t1v1`), leading to layout destruction. Network-level JSON mocking of API responses is much safer and cleaner.
- When a CI/CD pipeline restarts the server *during* a form submission, it causes 500/502 errors. Fix: Use client-side JS (`use:enhance`) to handle the UI state immediately, and delay the CI trigger (`git push` via `setTimeout`) until after the HTTP response closes.
- SvelteKit's `adapter-node` CSRF protection (`checkOrigin`) breaks when interacting via `localhost` vs `127.0.0.1` or through tunnels if `ORIGIN` isn't explicitly set. Disabled it safely because the admin routes strictly 404 in production.
- **Husky + PM2 + Playwright Conflict:** When a SvelteKit server action invokes `git commit` or `git push`, Husky triggers pre-commit/pre-push hooks. Because PM2 inherits its environment from the GitHub Actions runner, variables like `GITHUB_ACTIONS=true` leak into the PM2 daemon. This tricked Vitest into trying to write step summaries to temporary runner folders that had already been deleted, causing crashes.
  - *Fix 1:* Added `unset GITHUB_ACTIONS` and `unset GITHUB_STEP_SUMMARY` to the top of `.husky/pre-commit` and `.husky/pre-push`.
  - *Fix 2:* Limited Husky hooks to `npm run test:unit` only. Playwright visual E2E tests in background daemons fail frequently due to unconstrained default viewport sizes and headless rendering diffs.
  - *Fix 3:* Locked Playwright to a deterministic `1280x720` viewport in `playwright.config.ts`.
  - *Fix 4:* Modified upload endpoints to use `git commit --no-verify` and `git push --no-verify origin main` to instantly bypass tests specifically when uploading media.
