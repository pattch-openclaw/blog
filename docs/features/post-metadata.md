# Post Metadata: Author + Tags

_Added 2026-05-22._

## Frontmatter format

```yaml
author: sam           # defaults to "sam" if missing (backward compat)
tags:                 # YAML array or comma-separated, empty if missing
  - sveltekit
  - webdev
```

**Canonical author values:** `"sam"` | `"ai"` (custom strings also supported). No emoji in canonical value — emoji reserved for UI display only (`ai 🦞` on admin pages).

## Implementation

- `Post` type carries `author` + `tags` fields.
- `GitPostStore` parses and writes `author`/`tags` in frontmatter (missing fields default safely).
- `PostStore` interface includes `author`/`tags` in `savePost` + `updatePost` signatures.
- `getAllTags()` utility aggregates the global tag pool.
- Admin write page (`/admin/write`): author dropdown (sam / ai / custom), tag input with autocomplete from existing tags.
- Blog listing (`/blog`): tag cloud with counts, clickable tag pills for filtering (`/blog?tag=xxx`), author badge on each post card.
- Tag detail route (`/blog/tag/[tag]`): shows only posts with that tag.
- Existing posts parse without `author`/`tags` (default to `"sam"` / `[]`).
- `SupabasePostStore` handles `author`/`tags` — implemented and verified.
