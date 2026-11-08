# Sam's Personal Blog

Source for my personal blog — a small SvelteKit site for posts, projects, and updates.

- **Stack:** SvelteKit with `@sveltejs/adapter-node`, TipTap editor, marked-based markdown rendering
- **Content:** Supabase Postgres + Storage, fronted by ImageKit CDN
- **Hosting:** self-hosted home server — GitHub Actions self-hosted runner → PM2 (three instances) → Cloudflare Tunnels

Feature notes and lessons live in [`docs/`](docs/). This README covers architecture, local dev, testing, and deployment.

## Architecture

### Content stores

Posts and media sit behind swappable store interfaces (`src/lib/server/posts-store.ts`, `src/lib/server/media-store.ts`), selected at runtime by `CONTENT_STORE`:

- **`supabase`** — used by **all three deployed environments**. Postgres tables `posts` and `media_entries` (RLS enabled); Storage buckets `images`, `audio`, `fonts`.
- **`git`** — the code default when `CONTENT_STORE` is unset: posts as committed markdown (`src/routes/blog/<slug>/post.md`), media under `/media`. Still supported for dependency-free local work and as an escape hatch.

Post frontmatter supports `author` and `tags` (both backends; details in [docs/features/post-metadata.md](docs/features/post-metadata.md)).

### Runtime behavior

- `src/hooks.server.ts` gates everything sensitive: `/admin/*` returns 404 unless `SHOW_DRAFTS=true`, and unpublished posts 404 the same way. Production runs `SHOW_DRAFTS=false`, so the admin console simply doesn't exist publicly.
- The adapter-node CSRF origin check (`checkOrigin`) is disabled — tunnel/localhost origin mismatches broke form actions, and admin routes 404 in production anyway. See [docs/lessons-learned.md](docs/lessons-learned.md).
- Reader-facing image URLs in post content are rewritten from `*.supabase.co` to the ImageKit CDN at render time (`src/lib/server/imagekit.ts` + transforms in `src/lib/image-urls.ts`); no-op when `IMAGEKIT_URL` is unset. Every image links through to its full-resolution original. Details in [docs/features/imagekit.md](docs/features/imagekit.md).
- Post markdown supports `:::gallery`-style block directives via a registry-driven marked extension (`src/lib/directives/`). Details in [docs/features/directives-and-galleries.md](docs/features/directives-and-galleries.md).

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   SHOW_DRAFTS=true npm run dev
   ```
   `SHOW_DRAFTS=true` is required to see draft posts and the `/admin` pages — they 404 without it (see Runtime behavior above).
3. Open `http://localhost:5173`.

Local dev works against the `git` store with no external services; point `CONTENT_STORE=supabase` at a Supabase project (plus `SUPABASE_URL` / `SUPABASE_ANON_KEY`) to exercise that backend.

## Testing Strategy

Automated testing keeps the UI and markdown logic from breaking during deploys.

* **Vitest** — unit tests: frontmatter parsing, data loaders, store logic. Individual files opt into a real DOM with a `// @vitest-environment jsdom` docblock when the thing under test needs one — e.g. `src/lib/directives/client.test.ts`, which mounts rendered post HTML and clicks it, covering renderer ⇄ client-handler contracts that pure string tests can't reach.
* **Playwright** — E2E: 404 behavior, layout integrity, and visual-regression (screendiff) tests for the homepage. Locked to a deterministic `1280x720` viewport.
* **Husky Git Hooks** — `pre-commit` and `pre-push` run the full suite (`npm test`: Vitest + all Playwright, including screendiff). Server actions that commit media bypass hooks with `--no-verify`.
* **CI/CD** — on every push to `main`, the self-hosted runner runs unit tests plus non-screendiff E2E before deploying. Any failure halts the deploy; PM2 is not reloaded.

### Running tests

Full suite (including screendiff):
```bash
npm run test
```

Non-screendiff E2E only (what CI runs):
```bash
npx playwright test --grep-invert '@screendiff'
```

### Screendiff

Screendiff runs locally at pre-commit/pre-push time, deliberately excluded from CI so harmless drift (e.g. OS font-rendering differences between machines) can't block deployment. When you change the visual design intentionally:

```bash
npx playwright test --update-snapshots
```

Commit the updated snapshot files under `tests/` alongside your code.

Baselines are per-OS — `{name}-{projectName}-{os.platform()}.png` — so a Linux box reads only `*-chromium-linux.png` and a Mac only `*-chromium-darwin.png`. The two sets are not interchangeable; commit both and keep them apart. Setting up screendiff on a fresh Linux box (browser-install quirks, minting that platform's goldens once): [docs/screendiff-linux-setup.md](docs/screendiff-linux-setup.md).

## Self-Hosting Deployment Guide

Deployed with `@sveltejs/adapter-node` via a GitHub Actions self-hosted runner, managed by PM2, served through Cloudflare Tunnels.

### The Three-Environment Architecture

Three lightweight PM2 instances run concurrently. All read `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, and `IMAGEKIT_URL` from a shared `.blog-secrets` file next to the checkout on the host (path set in `ecosystem.config.cjs`; not in the repo).

| App | Port | `NODE_ENV` | `SHOW_DRAFTS` | Audience |
|---|---|---|---|---|
| `sams-blog-prod` | 3000 | production | `false` | Public internet. No admin pages, no drafts. |
| `sams-blog-staging` | 3001 | production | `true` | Behind Cloudflare Access. Admin + drafts visible. |
| `sams-blog-sandbox` | 3002 | development | `true` | Behind Cloudflare Access. Scratch space with file watching on. |

All three run `CONTENT_STORE=supabase` against the shared Supabase project.

### Step 1 — GitHub Actions self-hosted runner

1. Repository **Settings → Actions → Runners → New self-hosted runner**.
2. Install on the home server and run as a background service:
   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

### Step 2 — PM2

First start (after the runner has pulled the code):
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup # follow its output to run PM2 on boot
```

**After a power cycle**, restore everything:
```bash
pm2 resurrect        # restores all three blog instances — verify with `pm2 status`
./svc.sh start       # GitHub Actions runner
```

After changing `.blog-secrets`:
```bash
pm2 restart sams-blog-prod sams-blog-staging sams-blog-sandbox
```

### Step 3 — Cloudflare Tunnels

1. Create a tunnel in the Cloudflare dashboard.
2. Production: `blog.yourdomain.com` → `http://localhost:3000`.
3. Staging/sandbox (recommended): map those ports too, each behind **Cloudflare Access** so only your authenticated email can reach them.

Every push to `main` runs the test gate, rebuilds, and `pm2 reload`s all three instances.

## Roadmap

### Current priority — features

**Writing & content UX:** rich editor improvements, better image/media embedding workflow, post scheduling UI, draft versioning.

**Blog site features:** syntax highlighting for code blocks, comment system (giscus/Disqus), SEO (meta tags, sitemap, Open Graph/Twitter cards), tag & author filtering enhancements, search, analytics / view counts.

### Deprioritized — architecture

- **Separate sandbox database** — sandbox currently shares the Supabase project with staging/prod; goal is a dedicated sandbox DB while staging/prod share one (cost).
- **SQLite store** — a SQLite-backed `PostStore`/`MediaStore` for fully local, dependency-free operation.

The architectural items stay parked until the writing/reading experience is solid.

## Documentation

- [docs/features/directives-and-galleries.md](docs/features/directives-and-galleries.md) — `:::name` block directives, the gallery directive/builder, full-size click-through
- [docs/features/imagekit.md](docs/features/imagekit.md) — ImageKit CDN URL rewriting, transforms, full-resolution links
- [docs/features/post-metadata.md](docs/features/post-metadata.md) — author + tags frontmatter schema and rollout
- [docs/features/writing-and-media-admin.md](docs/features/writing-and-media-admin.md) — TipTap write page, media management, Supabase media store
- [docs/screendiff-linux-setup.md](docs/screendiff-linux-setup.md) — browser setup and golden minting on a fresh Linux box
- [docs/lessons-learned.md](docs/lessons-learned.md) — testing, CSRF, Husky/PM2/CI gotchas
