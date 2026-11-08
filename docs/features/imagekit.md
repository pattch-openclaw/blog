# Image Optimization — ImageKit CDN

_Implemented 2026-11-01._

**Problem**: serving high-resolution images directly from Supabase consumes excessive egress bandwidth, hitting free-tier limits.

**Solution**: ImageKit.io fronts Supabase Storage as a CDN + image optimization proxy, caching resized variants per URL.

## How it works

- The `images` bucket is **public**; short-lived signed URLs are gone (`supabase-url-resolver.ts` deleted). Reader-facing image delivery needs no secrets.
- **Origin config**: the ImageKit origin maps the Supabase *project root* (`https://[project].supabase.co/`), so CDN URLs keep the full storage path: `https://ik.imagekit.io/sts/storage/v1/object/public/images/...`.
- **URL rewrite** (`src/lib/server/imagekit.ts`): at render time the blog rewrites `*.supabase.co/storage/v1/object/{public,sign}/...` URLs in post content (and admin picker previews) to the endpoint from `IMAGEKIT_URL`, stripping legacy `?token=*** params are stripped). Pure string rewrite, no network; **no-op when `IMAGEKIT_URL` is unset** (plain public URLs still work).
- **Transforms** (`src/lib/image-urls.ts`, applied by the renderers in `src/lib/directives/`):
  - Inline post-body images: rendered at `?tr=w-1200` by a marked `renderer.image` override on the dedicated `postMarked` instance (a `walkTokens` rewrite used to do this; the renderer is needed because it also builds the link below).
  - Gallery main image: `?tr=w-1200`; thumbnails: `?tr=w-300,h-300`. Each thumb also carries the two sizes it implies — `data-main-src` (post-size, swapped into the main viewer) and `data-full-src` (original, for the click-through link) — so `directives/client.ts` never puts the full original on screen and never leaves a stale link behind.
  - Non-ImageKit URLs (git `/media/...` paths, external images) pass through untouched, and link to their own original file.
- **Click through to full resolution** — implemented 2026-11-03: every reader-facing image is wrapped in `<a class="image-full" target="_blank" rel="noopener">` pointing at the **same URL with no `tr=` param**, so clicking an image opens the original file at full size in a new tab (`fullSizeLink` in `directives/html.ts` + `fullSizeUrl` in `image-urls.ts`; `.image-full` is styled in `src/app.css` — zoom cursor, no inherited link underline, focus ring). It is a plain anchor, so it works with JS disabled; the gallery handler's job is only to keep that href pointed at whichever image is currently on screen. Images an author wrapped in their own link (`[![alt](img.png)](https://…)`) are left alone — the author's target wins and anchors never nest. `FULL_IMAGE_TRANSFORM` is the knob for that size: `''` (current) serves the untouched original, which is still edge-cached per URL, so Supabase is fetched once per cache expiry rather than per view; set it to e.g. `w-2400` to cap very large originals.
- **Deploy**: `IMAGEKIT_URL` lives in the shared `.blog-secrets` file and is injected via `ecosystem.config.cjs` into all three PM2 apps; `pm2 restart sams-blog-prod sams-blog-staging sams-blog-sandbox` after changing it.

## Notes & trade-offs

- Since the bucket is public, private ImageKit API keys are not required for read-only proxying and resizing, keeping the security surface minimal.
- Trade-off: anyone with an exact Supabase URL can bypass the CDN, so unpublished images are exposed to anyone who guesses their path.
- Admin media-page lazy thumbnails still sign per-folder (`/admin/media/thumbs`) — harmless on a public bucket; candidate for simplification now that signing is unnecessary.
