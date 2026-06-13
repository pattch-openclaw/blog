# Media Migration Plan

## Goal

Migrate blog media (images, audio, fonts) from local filesystem + Git to Supabase Storage, using a `MediaStore` abstraction layer that makes the storage backend swappable without touching application logic.

## Design Decisions

### 1. Upload Flow
When `CONTENT_STORE=supabase`, uploads go to Supabase Storage. The backend selection is an implementation detail of the `MediaStore` implementation — the UI and admin routes never need to know which backend is active.

### 2. Public URLs
Supabase Storage public URLs are sufficient (`https://<project>.supabase.co/storage/v1/object/public/images/filename`). RLS policies will be configured to allow public read. If issues arise, they'll be fixed at that point.

### 3. Path Naming Convention
Supabase Storage bucket paths use `images/filename`, `audio/filename`, `fonts/filename`. Existing local paths (`media/images/filename`) will be migrated to align. The `MediaStore` abstraction handles this mapping internally.

### 4. Image Picker on Write Page
Both `FileSystemMediaStore` and `SupabaseMediaStore` expose `listMedia()`. The write page's image picker calls `MediaStore.listMedia()` regardless of backend — no conditional logic in the UI layer.

---

## Step-by-Step Plan

### Step 1: Define the `MediaStore` Interface ✅ COMPLETED

Created `src/lib/server/media-store.ts` with the abstract interface:

```ts
export interface MediaEntry {
  id: string;
  bucket: string;          // 'images' | 'audio' | 'fonts'
  path: string;            // Supabase path or relative filesystem path
  filename: string;
  mime_type: string;
  size: number;
  public_url: string;      // resolved public/download URL
}

export interface MediaStore {
  listMedia(): Promise<MediaEntry[]>;
  uploadMedia(file: File, bucket: 'images' | 'audio' | 'fonts'): Promise<MediaEntry>;
  deleteMedia(entry: MediaEntry): Promise<void>;
}
```

`public_url` is computed per-implementation:
- `SupabaseMediaStore`: constructs the public URL from bucket + path
- `FileSystemMediaStore`: returns the local `/media/<bucket>/<filename>` path

### Step 2: Create `FileSystemMediaStore` ✅ COMPLETED

Ported the existing `/admin/media/+page.server.ts` filesystem logic into the new abstraction in `src/lib/server/file-media-store.ts`:

- **`listMedia()`**: Read from `media/images/`, `media/audio/`, `media/fonts/` directories, return `MediaEntry[]` with paths like `/media/images/filename`
- **`uploadMedia(file, bucket)`**: Write to local `media/<bucket>/`, `git add`, `git commit --no-verify`, `git push --no-verify origin main`
- **`deleteMedia(entry)`**: `fs.unlink` + `git rm --cached`, commit + push

This preserves current behavior for `CONTENT_STORE=git` mode.

### Step 3: Create `SupabaseMediaStore` ✅ COMPLETED

Implemented Supabase-specific logic in `src/lib/server/supabase-media-store.ts`:

- **`listMedia()`**: Query `media_entries` Postgres table, fetch file metadata from `supabase.storage.from(bucket).list()`
- **`uploadMedia(file, bucket)`**: 
  - Use `supabase.storage.from(bucket).upload(path, file, { upsert: true })`
  - Insert row into `media_entries` table with bucket, path, filename, mime_type, size
- **`deleteMedia(entry)`**: 
  - Delete from `supabase.storage.from(entry.bucket).remove([entry.path])`
  - Delete row from `media_entries` table

**Public URL construction:**
```
https://<SUPABASE_PROJECT>.supabase.co/storage/v1/object/public/images/<filename>
```

### Step 4: Wire Media Selection into Existing Code ✅ COMPLETED

#### 4a: Media store selector ✅ COMPLETED

Add a media store selector in `src/lib/server/media-store.ts`:

```ts
export function getMediaStore(): MediaStore {
  const store = process.env.CONTENT_STORE?.toLowerCase().trim();
  if (store === 'supabase') return new SupabaseMediaStore();
  return new FileSystemMediaStore();
}
```

#### 4b: Update `/admin/media/+page.server.ts` ✅ COMPLETED

Replace direct `fs` operations with `MediaStore` calls:
- `load()`: call `getMediaStore().listMedia()` instead of `fs.readdir`
- `upload` action: call `getMediaStore().uploadMedia(file, type)`
- `delete` action: call `getMediaStore().deleteMedia(entry)`

**Changes made (2026-06-11):**
- Rewrote `load()` to use `MediaStore.listMedia()` and group results by bucket
- Updated `upload` action to use `MediaStore.uploadMedia()`
- Updated `delete` action to use `MediaStore.deleteMedia()` with entry ID lookup
- Removed filesystem-specific git operations (`git add/commit/push` now handled by store)

#### 4c: Update `/admin/write/+page.svelte` image picker ✅ COMPLETED

The write page's "Insert Image" dropdown now uses `getMediaStore().listMedia()` for the image source, returning entries with their `public_url` for display and markdown insertion.

### Step 4a: Supabase Media Upload ✅ COMPLETED

- Images correctly upload to Supabase Storage when `CONTENT_STORE=supabase`
- Uploads are stored in the appropriate bucket (`images`, `audio`, `fonts`)
- Media entries are properly recorded in the `media_entries` Postgres table

### Step 4b: Supabase Media Display ✅ COMPLETED

- Blog post images use signed URLs from Supabase Storage
- Images render correctly on published posts
- Public URL construction works for all media types

### Step 5: Update `/media/[...file]/+server.ts` ✅ COMPLETED

Replaced local file serving with Supabase Storage proxying for `CONTENT_STORE=supabase`:
- Download the file from `supabase.storage.from(bucket).download(path)`
- Stream it back with correct MIME type and cache headers
- For `CONTENT_STORE=git`, fall back to local `fs.readFileSync()`

### Step 6: One-Shot Migration Script

Create a migration script (e.g., `scripts/migrate-media.ts`) that:

1. Iterates all files in `media/images/`, `media/audio/`, `media/fonts/`
2. For each file: uploads to Supabase Storage, inserts into `media_entries`
3. Logs results and errors

**Status:** Not yet implemented. This is only needed if you want to migrate existing local media to Supabase. Since your migration is working with new uploads, this is optional.

### Step 7: Enable on Sandbox ✅ COMPLETED

- Verify sandbox runs with `CONTENT_STORE=supabase` (already set per README)
- Confirm `/admin/media` loads images from Supabase Storage
- Confirm `/admin/write` image picker shows Supabase images
- Confirm published posts render images from Supabase URLs

### Step 8: Cleanup ✅ COMPLETED

- ✅ `media.ts` filesystem utility removed (verified)
- ✅ `fs`-based media logic removed from routes (replaced by MediaStore abstraction)
- ✅ `README.md` updated to reflect completed media migration
- ✅ "Media integration" removed from pending items in README

---

## ✅ Media Integration Complete!

**What's been implemented:**
- ✅ `MediaStore` interface abstraction
- ✅ `FileSystemMediaStore` for `CONTENT_STORE=git` mode
- ✅ `SupabaseMediaStore` for `CONTENT_STORE=supabase` mode
- ✅ Media store selector logic
- ✅ `/admin/media` page updated to use `MediaStore`
- ✅ `/admin/write` image picker uses `MediaStore.listMedia()`
- ✅ `/media/[...file]/+server.ts` proxies to Supabase when configured
- ✅ Images upload correctly to Supabase Storage
- ✅ Blog posts use signed Supabase URLs for images

**Remaining work:**
- 🔄 One-shot migration script (optional - only if you have existing local media to migrate)
- 🔄 Optional: Add image preview/watermark functionality

---

## Files to Create/Modify

### New files
- `src/lib/server/media-store.ts` — `MediaStore` interface + selection logic
- `src/lib/server/file-media-store.ts` — `FileSystemMediaStore` implementation
- `src/lib/server/supabase-media-store.ts` — `SupabaseMediaStore` implementation
- `scripts/migrate-media.ts` — one-shot migration script

### Modified files
- `src/routes/admin/media/+page.server.ts` — use `MediaStore` instead of direct `fs`
- `src/routes/admin/write/+page.svelte` (or its server action) — use `MediaStore.listMedia()` for image picker
- `src/routes/media/[...file]/+server.ts` — proxy to Supabase Storage when `CONTENT_STORE=supabase`
- `README.md` — update project notes, remove media items from pending TODO

---

## Testing Strategy

- Unit tests for both `MediaStore` implementations (mock Supabase client for Supabase tests)
- E2E: verify `/admin/media` gallery loads on sandbox
- E2E: verify image picker on `/admin/write` shows Supabase images
- E2E: verify published post images render from Supabase URLs
- Verify screenshot diffs still pass with media integration

---

## Database Schema

### Table `media_entries`

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary Key |
| `bucket` | `text` | Not Null |
| `path` | `text` | Not Null |
| `filename` | `text` | Not Null |
| `mime_type` | `text` | Nullable |
| `size` | `int8` | Nullable |
| `uploaded_at` | `timestamptz` | Nullable |

**Unique Constraint:** `(bucket, path)` uniquely identifies a storage object

**Notes:**
- `path` format: `bucket/filename` (e.g., `images/my-photo.png`)
- `filename` is stored separately for query convenience but is derivable from `path`
- No `post_id` column — media is not linked to specific blog posts
- When deleting a blog post, media entries remain (images can be reused across posts)
