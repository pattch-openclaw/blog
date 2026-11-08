# Block Directives & Image Galleries

_Added 2026-09-22._

## Block directives in post markdown

`:::name ... :::` fences render custom HTML components via a marked extension (`src/lib/directives/`).

- **Registry-driven:** adding a directive = one renderer in `directiveRenderers` (`src/lib/directives/index.ts`) plus (if interactive) one handler in `directiveHandlers` (`src/lib/directives/client.ts`).
- **Shared rendering helpers:** `directives/html.ts` (`escapeAttr`, `fullSizeLink`) and `directives/token-tree.ts` (pre-order marked token walk) are used by both the gallery renderer and the post-content image renderer, so every image emits the same markup and the same full-size click-through affordance. `directives/client.ts` exports `galleryThumbSources`, the pure "which URL goes where" decision, unit-tested in jsdom by `directives/client.test.ts`.
- Unclosed directives and directive syntax inside code fences degrade to plain markdown; unknown names render their body as markdown in a wrapper.
- No schema changes — directives live in the existing post content string, and Supabase signed-URL replacement runs on raw markdown before parsing so gallery image URLs sign normally.

## `:::gallery` directive

Body is markdown image lines; renders one large main image with a thumbnail strip below. First image is active in the static HTML (no-JS friendly); clicking a thumbnail swaps the main image and moves `is-active`/`aria-current`, and clicking the main image opens its full-size original in a new tab (see [imagekit.md](imagekit.md)).

```markdown
:::gallery
![alt text](https://.../images/a.png)
![other image](https://.../images/b.png)
:::
```

## Client wiring (agreed design)

A single Svelte action `use:directives` on the prose container attaches one delegated click listener per mounted container (removed on destroy) — never per-gallery or global listeners. Applied on the post page and the `/admin/write` live preview. Gallery styles live in `src/app.css` so post pages and admin preview render identically (as do the `.image-full` styles for full-size click-through links, which apply to post-body images too).

## Gallery builder on `/admin/write`

A collapsed “+ Add Gallery” button expands a scrollable thumbnail grid of all uploaded images; tap to toggle selection (click order = gallery order, shown as numbered badges). Generates the `:::gallery` directive markdown (pure helper `buildGalleryMarkdown` in `src/lib/directives/gallery-markdown.ts`) with a copy-to-clipboard field and Clear button, mirroring the existing single-image insert affordance. The live preview renders the copied directive and its thumbnails are clickable (same `use:directives` action).
