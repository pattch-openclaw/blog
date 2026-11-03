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
* **Vitest**: Used for unit tests, parsing the Markdown frontmatter correctly, and checking data loaders. Individual files opt into a real DOM with a `// @vitest-environment jsdom` docblock (jsdom) when the thing under test needs one — e.g. `src/lib/directives/client.test.ts`, which mounts rendered post HTML and clicks it, covering renderer ⇄ client-handler contracts that pure string tests can't reach.
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

### Setting Up Screendiff (Browser) Tests on a Fresh Linux Box

A macOS box needs nothing beyond `npx playwright install chromium`. On Linux the same command can fail in three unrelated ways. Verified on Ubuntu 26.04 arm64; nothing here is Ubuntu-specific.

**1. Install the browser, with downloads kept off `/tmp`**
```bash
npm ci                                      # brings the pinned @playwright/test
rm -rf /tmp/playwright-download-* || true   # ~180 MB each, left behind by failed attempts
mkdir -p ~/.cache/pw-tmp
TMPDIR=$HOME/.cache/pw-tmp npx playwright install chromium
```
Plain `install chromium` fetches Chrome for Testing *and* the headless shell. The default headless session launches the headless shell, so a partial install shows up later as `Executable doesn't exist at …/chromium_headless_shell-<revision>/chrome-linux/headless_shell`. Don't add `--with-deps` reflexively (it wants sudo); check whether the distro already has the libraries:
```bash
~/.cache/ms-playwright/chromium_headless_shell-<revision>/chrome-linux/headless_shell --version
```
A version string means you're done. `error while loading shared libraries` means you aren't — then run `npx playwright install-deps chromium`.

**2. If Playwright refuses to install: `ERROR: Playwright does not support chromium on ubuntu26.04-arm64`**
Playwright maps your distro release onto the newest release its *own version* knows (see `node_modules/playwright-core/lib/server/utils/hostPlatform.js`). An LTS newer than that gets a literal `ubuntu26.04-arm64` key with no download entry. Either of:
```bash
# a) Keep the pin, install for the nearest supported release. Needed only while installing —
#    running the suite afterwards requires no special environment.
TMPDIR=$HOME/.cache/pw-tmp PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-arm64 \
  npx playwright install --force chromium

# b) Or raise the pin: 1.61 is the first minor with Ubuntu 26.04 entries (1.60.0 has none).
npm i -D @playwright/test@^1.61.1
```
Option (b) changes the bundled Chromium build — Chrome 145 on 1.58.2 vs Chrome 156 on 1.64.1 — and therefore *every* golden file, so it must land together with an `--update-snapshots` run on each OS. The same reasoning applies to `npx playwright install --with-deps chromium` in the deploy workflow: it fails identically the day the runner moves to a newer release than the pinned Playwright.

**3. If the download dies part-way or hangs at 100%**
`Unknown system error -122` (EDQUOT) on `write` means `/tmp` is a small quota'd tmpfs on this box — that's what step 1's `TMPDIR` prevents. A fetch that stalls after completing is the bundled fetcher hanging; get the same archive by hand instead. Revision comes from `node_modules/playwright-core/browsers.json`, and the archive URL for your architecture from `DOWNLOAD_PATHS` in `node_modules/playwright-core/lib/server/registry/index.js` (arm64 unpacks to `chrome-linux/`, x64 Chrome-for-Testing to `chrome-linux64/`):
```bash
REV=1208; M=$HOME/.cache/ms-playwright; cd ~/.cache/pw-tmp
B=https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/$REV
curl -fL -O $B/chromium-linux-arm64.zip -O $B/chromium-headless-shell-linux-arm64.zip
mkdir -p $M/chromium-$REV $M/chromium_headless_shell-$REV
unzip -qo chromium-linux-arm64.zip -d $M/chromium-$REV
unzip -qo chromium-headless-shell-linux-arm64.zip -d $M/chromium_headless_shell-$REV
chmod +x $M/chromium-$REV/chrome-linux/chrome $M/chromium_headless_shell-$REV/chrome-linux/headless_shell
touch $M/chromium-$REV/INSTALLATION_COMPLETE $M/chromium_headless_shell-$REV/INSTALLATION_COMPLETE
rm -f ~/.cache/pw-tmp/*.zip
```
`INSTALLATION_COMPLETE` is the marker that says "this browser is installed". A directory without it is garbage-collected by the next `npx playwright install` (`Removing unused browser at …`), which is why a half-finished install can look like it reverted itself.

**4. Mint this platform's goldens once, then commit them**
```bash
npx playwright test --grep-invert '@screendiff'             # behaviour first — no images, fast
npx playwright test --grep '@screendiff' --update-snapshots # writes tests/*-chromium-linux.png
git add tests/*-snapshots/*-chromium-linux.png
```
`npm run test` should then report 156 unit tests and 10 E2E tests passing.

Baselines are named `{name}-{projectName}-{os.platform()}.png`, so a Linux run reads only `*-chromium-linux.png` and a Mac only `*-chromium-darwin.png`. There is no selector and nothing to configure; a platform with no golden simply writes one and fails that run once. Commit both sets and keep them apart — they are not interchangeable (a Linux render against the darwin goldens differs by 10,500–13,900 px at identical 1280×720, ~100× the `maxDiffPixels: 100` budget, from font rasterisation alone). Note what the suffix does *not* record: the Chromium build or the installed fonts. A `-linux` golden is only valid on boxes with the same `@playwright/test` revision and comparable font packages, which is why CI keeps running `--grep-invert '@screendiff'` and never mints its own.

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

## Directives & Image Galleries (2026-09-22)
- **Block directives in post markdown:** `:::name ... :::` fences render custom HTML components via a marked extension (`src/lib/directives/`). Registry-driven: adding a directive = one renderer in `directiveRenderers` (`src/lib/directives/index.ts`) plus (if interactive) one handler in `directiveHandlers` (`src/lib/directives/client.ts`). Unclosed directives and directive syntax inside code fences degrade to plain markdown; unknown names render their body as markdown in a wrapper. No schema changes — directives live in the existing post content string, and Supabase signed-URL replacement runs on raw markdown before parsing so gallery image URLs sign normally.
- **`:::gallery` directive:** body is markdown image lines; renders one large main image with a thumbnail strip below. First image is active in the static HTML (no-JS friendly); clicking a thumbnail swaps the main image and moves `is-active`/`aria-current`, and clicking the main image opens its full-size original in a new tab (see the ImageKit section below). Example:

  ```markdown
  :::gallery
  ![alt text](https://.../images/a.png)
  ![other image](https://.../images/b.png)
  :::
  ```

- **Client wiring (agreed design):** a single Svelte action `use:directives` on the prose container attaches one delegated click listener per mounted container (removed on destroy) — never per-gallery or global listeners. Applied on the post page and the `/admin/write` live preview. Gallery styles live in `src/app.css` so post pages and admin preview render identically (as do the `.image-full` styles for full-size click-through links, which apply to post-body images too).
- **Shared rendering helpers:** `directives/html.ts` (`escapeAttr`, `fullSizeLink`) and `directives/token-tree.ts` (pre-order marked token walk) are used by both the gallery renderer and the post-content image renderer, so every image emits the same markup and the same click-through affordance. `directives/client.ts` exports `galleryThumbSources`, the pure "which URL goes where" decision, unit-tested in jsdom by `directives/client.test.ts`.
- **Gallery builder on `/admin/write`:** a collapsed “+ Add Gallery” button expands a scrollable thumbnail grid of all uploaded images; tap to toggle selection (click order = gallery order, shown as numbered badges). Generates the `:::gallery` directive markdown (pure helper `buildGalleryMarkdown` in `src/lib/directives/gallery-markdown.ts`) with a copy-to-clipboard field and Clear button, mirroring the existing single-image insert affordance. The live preview renders the copied directive and its thumbnails are clickable (same `use:directives` action).

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

### Image Optimization (ImageKit CDN) — ✅ Implemented 2026-11-01
**Problem**: Serving high-resolution images directly from Supabase consumes excessive egress bandwidth, hitting free-tier limits.
**Solution**: ImageKit.io fronts Supabase Storage as a CDN + image optimization proxy, caching resized variants per URL.

**How it works (implemented)**:
- The `images` bucket is **public**; short-lived signed URLs are gone (`supabase-url-resolver.ts` deleted). Reader-facing image delivery needs no secrets.
- **Origin config**: the ImageKit origin maps the Supabase *project root* (`https://[project].supabase.co/`), so CDN URLs keep the full storage path: `https://ik.imagekit.io/sts/storage/v1/object/public/images/...`.
- **URL rewrite** (`src/lib/server/imagekit.ts`): at render time the blog rewrites `*.supabase.co/storage/v1/object/{public,sign}/...` URLs in post content (and admin picker previews) to the endpoint from `IMAGEKIT_URL`, stripping legacy `?token=*** params are stripped). Pure string rewrite, no network; **no-op when `IMAGEKIT_URL` is unset** (plain public URLs still work).
- **Transforms** (`src/lib/image-urls.ts`, applied by the renderers in `src/lib/directives/`):
  - Inline post-body images: rendered at `?tr=w-1200` by a marked `renderer.image` override on the dedicated `postMarked` instance (a `walkTokens` rewrite used to do this; the renderer is needed because it also builds the link below).
  - Gallery main image: `?tr=w-1200`; thumbnails: `?tr=w-300,h-300`. Each thumb also carries the two sizes it implies — `data-main-src` (post-size, swapped into the main viewer) and `data-full-src` (original, for the click-through link) — so `directives/client.ts` never puts the full original on screen and never leaves a stale link behind.
  - Non-ImageKit URLs (git `/media/...` paths, external images) pass through untouched, and link to their own original file.
- **Click through to full resolution** — ✅ Implemented 2026-11-03: every reader-facing image is wrapped in `<a class="image-full" target="_blank" rel="noopener">` pointing at the **same URL with no `tr=` param**, so clicking an image opens the original file at full size in a new tab (`fullSizeLink` in `directives/html.ts` + `fullSizeUrl` in `image-urls.ts`; `.image-full` is styled in `src/app.css` — zoom cursor, no inherited link underline, focus ring). It is a plain anchor, so it works with JS disabled; the gallery handler's job is only to keep that href pointed at whichever image is currently on screen. Images an author wrapped in their own link (`[![alt](img.png)](https://…)`) are left alone — the author's target wins and anchors never nest. `FULL_IMAGE_TRANSFORM` is the knob for that size: `''` (current) serves the untouched original, which is still edge-cached per URL, so Supabase is fetched once per cache expiry rather than per view; set it to e.g. `w-2400` to cap very large originals.
- **Deploy**: `IMAGEKIT_URL` lives in the shared `.blog-secrets` file and is injected via `ecosystem.config.cjs` into all three PM2 apps; `pm2 restart sams-blog-prod sams-blog-staging sams-blog-sandbox` after changing it.
- Admin media-page lazy thumbnails still sign per-folder (`/admin/media/thumbs`) — harmless on a public bucket; can be simplified later.

*Note:* Since the bucket is public, private ImageKit API keys are not required for read-only proxying and resizing, keeping the security surface minimal. Trade-off: anyone with an exact Supabase URL can bypass the CDN, so unpublished images are exposed to anyone who guesses their path.

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
- **Per-OS Playwright Goldens:** Screenshot baselines are keyed by host OS (`{name}-{projectName}-{os.platform()}.png`), so `*-chromium-darwin.png` and `*-chromium-linux.png` sit side by side in the same directory and each machine reads only its own. Don't force a shared set, and don't let CI generate one — see [Setting Up Screendiff (Browser) Tests on a Fresh Linux Box](#setting-up-screendiff-browser-tests-on-a-fresh-linux-box).
- **Visual Regression Flakiness:** Playwright visual regression tests are highly sensitive to active UI states. A simple `locator.click()` can leave a focus ring that fails screenshot diffs; appending `.blur()` immediately resolves this.
- **Mocking SvelteKit SSR:** Replacing HTML content directly in Playwright via `route.fulfill({ body: html.replace(...) })` strips out SvelteKit's dynamically generated scoped CSS classes (e.g., `svelte-1x4t1v1`), leading to layout destruction. Network-level JSON mocking of API responses is much safer and cleaner.
- When a CI/CD pipeline restarts the server *during* a form submission, it causes 500/502 errors. Fix: Use client-side JS (`use:enhance`) to handle the UI state immediately, and delay the CI trigger (`git push` via `setTimeout`) until after the HTTP response closes.
- SvelteKit's `adapter-node` CSRF protection (`checkOrigin`) breaks when interacting via `localhost` vs `127.0.0.1` or through tunnels if `ORIGIN` isn't explicitly set. Disabled it safely because the admin routes strictly 404 in production.
- **Husky + PM2 + Playwright Conflict:** When a SvelteKit server action invokes `git commit` or `git push`, Husky triggers pre-commit/pre-push hooks. Because PM2 inherits its environment from the GitHub Actions runner, variables like `GITHUB_ACTIONS=true` leak into the PM2 daemon. This tricked Vitest into trying to write step summaries to temporary runner folders that had already been deleted, causing crashes.
  - *Fix 1:* Added `unset GITHUB_ACTIONS` and `unset GITHUB_STEP_SUMMARY` to the top of `.husky/pre-commit` and `.husky/pre-push`.
  - *Fix 2:* Limited Husky hooks to `npm run test:unit` only. Playwright visual E2E tests in background daemons fail frequently due to unconstrained default viewport sizes and headless rendering diffs.
  - *Fix 3:* Locked Playwright to a deterministic `1280x720` viewport in `playwright.config.ts`.
  - *Fix 4:* Modified upload endpoints to use `git commit --no-verify` and `git push --no-verify origin main` to instantly bypass tests specifically when uploading media.
