# Writing & Media Admin

_Edited through 2026-06-16._

## Rich editor with live preview

`/admin/write` uses TipTap (ProseMirror-based) with a live preview panel. Supports rich formatting, code blocks, and markdown export. Editor state persists in local storage; submission goes through SvelteKit form actions via `use:enhance`.

## Image insert on the write page

An "Insert Image" dropdown lists all images from `/media/images/`. Selecting one shows a preview thumbnail, generates the markdown `![alt](/media/images/{filename})`, and offers a copy button. The image list is loaded server-side in `+page.server.ts`.

## Unified media management — `/admin/media`

Gallery view of all uploaded assets with thumbnails in a responsive grid:

- **Upload** images/audio/fonts; the form picks media type and file. Success alerts show the file path and suggested markdown syntax.
- **Delete** requires confirmation. The action POSTs to `?/delete` with the file path and removes the file from the filesystem + git index (`git rm --cached`), then commits (`--no-verify`) and pushes.
- Items are grouped by type (images/audio/fonts) in the UI.

## Supabase media store

When `CONTENT_STORE=supabase`, `/admin/media` uses `SupabaseMediaStore` for all operations: files in Supabase Storage buckets (`images`, `audio`, `fonts`), metadata in the `media_entries` Postgres table. When `CONTENT_STORE=git`, the `FileSystemMediaStore` is used. Both satisfy the same `MediaStore` interface, so backends are swappable.

**2026-06-11 refinements:**

- **Unlinked uploads:** `media_entries.post_id` is `null` for media uploaded from `/admin/media` that isn't attached to a post, so media can be stored before any post exists.
- **ID-based deletes:** the delete action uses entry IDs instead of file paths, keeping it backend-agnostic (no path parsing).
- **Legacy utilities removed:** the old filesystem-specific helpers in `src/lib/server/media.ts` are gone — `FileSystemMediaStore` implements its own internal logic.
