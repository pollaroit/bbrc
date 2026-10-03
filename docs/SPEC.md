# R2 storage: images & documents

Specification for Cloudflare R2 integration, member uploads, and club document workflow.

**Status:** Draft (grill completed 2026-03-10)  
**Phases:** 1) R2 integration → 2) Images → 3) Documents

---

## Goals

- Store **images** (avatars, post/comment attachments, shelf cover overrides) in R2.
- Store **PDF documents** per book with admin approval (similar to book requests).
- Serve uploads via **public R2.dev URLs** (custom domain deferred).
- Upload via **presigned direct-to-R2** from the browser (avoid Vercel body limits).

---

## Decisions (from grill)

| Topic | Decision |
|--------|-----------|
| Access | Public bucket; objects reachable via R2 public / `*.r2.dev` URL |
| Upload | Presigned PUT (or POST) → client uploads → API **commit** records metadata |
| `[env]` prefix | Match Vercel: `development` \| `preview` \| `production` |
| Shelf image path | `/[env]/users/[username]/shelves/[shelfSlug]/image.*` (not global shelf slug alone) |
| Avatar | Custom upload **replaces** `User.image` with public R2 URL; keep OAuth URL until first upload |
| Documents on book page | **Approved only**; count toward `MAX_DOCS_PER_BOOK` only when approved |
| Document object key | `/[env]/books/[bookSlug]/documents/[documentSlug].pdf` |
| Document slug | **Globally unique** (like posts) |
| Comment images | Post comments **and** feedback comments |
| Image lifecycle | Create **and** edit (upload, replace, remove) for all image types |
| Document review | **Admin sheet** + notifications (mirror book requests) |

---

## Limits & formats

| Constant | Value |
|----------|--------|
| `MAX_IMAGE_SIZE` | 2 MiB |
| `MAX_DOCUMENT_SIZE` | 10 MiB |
| `MAX_DOCS_PER_BOOK` | 3 (approved only) |
| `ALLOWED_IMAGE_MIME` | `image/jpeg`, `image/png`, `image/webp` |
| `ALLOWED_DOCUMENT_MIME` | `application/pdf` |

**Extension policy:** Object keys use stable suffixes (`.jpg`, `.png`, `.pdf`) where specified. On commit, server validates MIME (magic bytes), may **transcode** (e.g. WebP/PNG → JPEG for avatar) or reject. Document uploads must be PDF.

---

## Object key layout

All keys are prefixed with `{env}/` where `env = process.env.VERCEL_ENV ?? development` (normalize: `VERCEL_ENV` values `development` | `preview` | `production`).

| Asset | Key pattern | Notes |
|--------|-------------|--------|
| User avatar | `{env}/users/{username}/avatar.jpg` | Single object; **delete previous** on replace |
| Post image | `{env}/posts/{postSlug}/image.png` | One per post; delete on remove/replace |
| Comment image | `{env}/comments/{commentSlug}/image.png` | One per comment |
| Shelf cover override | `{env}/users/{username}/shelves/{shelfSlug}/image.png` | Optional; UI falls back to book-grid cover |
| Book document | `{env}/books/{bookSlug}/documents/{documentSlug}.pdf` | After approval; delete/replace on admin/author rules |

**Public URL:** `R2_PUBLIC_BASE_URL` + `/` + key (configure per bucket public access).

**DB storage:** Prefer storing full public URL or `{base}/{key}` consistently; images on entities (`User.image`, nullable URL columns on Post/Comment/Shelf) and `Document.documentKey` (key or URL — pick one convention in phase 1).

---

## Environment variables (phase 1)

```bash
# Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=          # e.g. https://pub-xxxx.r2.dev

# Optional: separate bucket for preview (default: same bucket, different prefix)
# R2_BUCKET_NAME_PREVIEW=
```

Server-only secrets; never expose `SECRET` to client. Presigned URLs generated in API.

---

## Phase 1 — Integrate Cloudflare R2

### 1.1 Shared package (`packages/storage` or `packages/r2`)

- S3 client (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
- `getStorageEnv(): 'development' | 'preview' | 'production'`.
- `buildObjectKey(kind, params) → string` (single source of truth for paths).
- `createPresignedUpload(input): { url, key, headers }` (PUT).
- `deleteObject(key)` (best-effort on replace/remove).
- `headObject(key)` (verify upload before DB commit).
- Unit tests for key builders (no live R2 required).

### 1.2 API patterns

- **Init upload:** authenticated procedure → returns presigned URL + expected key + max size.
- **Commit upload:** authenticated procedure → `headObject`, validate size/MIME, write DB, delete old object if replacing.
- **Abort:** optional; rely on lifecycle rules for orphaned uploads initially.

### 1.3 Web / Next.js

- `remotePatterns` in `next.config` for `R2_PUBLIC_BASE_URL` host.
- Small client helper: `uploadFileToPresignedUrl(file, presigned)`.

### 1.4 Ops

- **Public read** on the bucket (R2 public access / `*.r2.dev`).
- **CORS** on the bucket (Cloudflare dashboard → R2 → bucket → Settings → CORS):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://YOUR_PRODUCTION_DOMAIN",
      "https://*.vercel.app"
    ],
    "AllowedMethods": ["PUT", "HEAD", "GET"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Adjust origins for preview deployments. Browser uploads use **presigned PUT** with `Content-Type` and `Content-Length` headers only.

- Local dev: same bucket with `development/` prefix (`VERCEL_ENV` unset → `getStorageEnv()` returns `development`).
- Optional smoke: `bun run --filter @bbrc/storage smoke` (requires R2 env vars).

**Exit criteria:** Manual test upload + delete from dev; presigned flow works; no secrets in client bundle.

---

## Phase 2 — Images

### 2.1 Schema (Prisma)

| Model | New fields |
|-------|------------|
| `User` | Continue `image`; set to R2 URL on avatar commit |
| `Post` | `imageUrl String?` (or `imageKey`; align with storage helper) |
| `Comment` | `imageUrl String?` |
| `Shelf` | `coverImageUrl String?` — when null, UI uses `coverPreviewCoverIds` mosaic |

Migration + Zod/API schemas + ISR paths as needed.

### 2.2 API modules

- `upload` / `media` router (or extend entity routers):
  - `initAvatarUpload`, `commitAvatarUpload`
  - `initPostImageUpload`, `commitPostImageUpload`, `removePostImage`
  - Same for comment, shelf cover
- Authorization:
  - Avatar: self only
  - Post/comment: author; not banned
  - Shelf: shelf owner
- On replace/remove: delete prior R2 object when key changes

### 2.3 UI

| Surface | Behavior |
|---------|----------|
| Settings / profile | Avatar picker, preview, remove → revert to default/OAuth |
| Compose post / edit post | Optional single image; show in feed & detail |
| Comment form / edit | Optional single image |
| Shelf create/edit | Optional cover override; clear → grid mosaic |
| Display | `<Image>` with R2 host; alt text from context |

Forms: reuse shelf-style patterns (sections, validation messages, size/type errors).

### 2.4 ISR / SEO

- Revalidate post, comment, user profile, shelf paths on image commit/remove.
- OG images unchanged unless post OG later uses post image (out of scope unless added).

**Exit criteria:** All four image types upload/replace/remove; old objects deleted; 2MB enforcement; formats enforced.

---

## Phase 3 — Documents

### 3.1 Schema

```prisma
enum DocumentStatus {
  pending
  approved
  rejected
}

model Document {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  name   String
  slug   String @unique
  language String // ISO 639-1, 2 letters

  userId String @map("user_id")
  user   User   @relation(...)

  bookId String @map("book_id")
  book   Book   @relation(...)

  documentKey String @map("document_key") // R2 key or public URL

  status DocumentStatus @default(pending)
  acceptanceNotes String?
  rejectionReason String?

  @@index([bookId, status])
  @@index([userId])
  @@map("document")
}
```

Align field lengths and Zod refines with `book-request` patterns.

### 3.2 Business rules

- **Create:** member uploads PDF → `pending`; object stored at key (or staged until approve — **default: upload on submit, pending visible to author/admin only**).
- **Cap:** reject create when book already has 3 **approved** documents.
- **Approve / reject:** admin only; set `acceptanceNotes` / `rejectionReason`; notify author (mirror book request triggers).
- **Edit:** author or admin; pending/rejected editable; approved edits TBD (metadata only vs re-upload — **default: metadata + replace PDF while approved with re-review optional — start with metadata-only edit + replace triggers pending**).
- **Delete:** author (own pending/rejected) + admin; remove R2 object.
- **Download:** public page lists **approved** only; link = public R2 URL or API redirect.

### 3.3 API (`document` module)

Mirror `book-request`:

- `create`, `update`, `listByBook`, `listMine`, `listPending` (admin), `approve`, `reject`
- `initDocumentUpload` / `commitDocument` (presigned, then create row pending)
- Slug from `name` (shared slugify + uniqueness)

### 3.4 Admin UI

- `AdminDocumentRequestsSheet` (or extend admin create menu / users area) — copy UX from `admin-book-requests-sheet`.
- Actions: approve with optional notes, reject with reason.

### 3.5 Web UI

| Location | Behavior |
|----------|----------|
| Book list card | Green document icon if book has ≥1 **approved** document |
| Book detail | **Documents** section: list approved PDFs (name, language, uploader, download) |
| Book detail | **Add document** → `/books/[slug]/documents/new` (user path: prefer `/books/[slug]/documents/new` over `edit/docs` unless we keep exact path — **implement as specified:** `/books/[slug]/edit/docs/new`) |
| Edit document | `/books/[slug]/edit/docs/[documentSlug]/edit` (author or admin) |
| Sitting (reading, book selected) | **Add document** → same new page with `?book=` or context pre-filled |

Forms: name, language (ISO 639-1 select/input), PDF file, submit → pending.

### 3.6 Notifications & XP

- Follow `notification-triggers` patterns for submit / approve / reject.
- XP: optional later; note in backlog if not in book-request parity.

**Exit criteria:** End-to-end PDF upload, admin approval, public download list, cap enforced, icons on book cards.

---

## Route map (documents)

| Route | Purpose |
|-------|---------|
| `/books/[slug]/edit/docs/new` | Create document (upload + metadata) |
| `/books/[slug]/edit/docs/[documentSlug]/edit` | Edit metadata / replace file |
| Sitting page CTA | Link to new doc route with book slug query |

Consider alias `/books/[slug]/documents/new` → redirect to edit path for readability (optional).

---

## Security

- Presigned URLs: short TTL (e.g. 5–15 min), single key, content-type constraint when possible.
- Commit endpoints: verify object exists, size ≤ max, content-type matches.
- AuthZ on every commit/delete (owner, admin, shelf owner, etc.).
- No listing of bucket; only known keys from DB.
- Rate limit upload init per user (optional phase 1.5).

---

## Open questions / backlog

- [ ] **Orphan uploads:** lifecycle rule vs cron to purge uncommitted keys older than 24h.
- [ ] **Slug rename:** post/shelf/book slug change → move R2 keys or accept stale URLs (prefer: update keys on slug change or store by id — document uses bookSlug in path; **rename book slug** must move PDF keys or store bookId-based keys later).
- [ ] **Document re-upload while approved:** auto-approve admin uploads vs always pending.
- [ ] **Image moderation:** none in v1.
- [ ] **Custom domain** for R2 when ready (swap `R2_PUBLIC_BASE_URL` only).
- [ ] **Extension chrome** / mobile upload UX.

---

## Implementation order (checklist)

### Phase 1
- [ ] R2 bucket + CORS + public access (manual in Cloudflare)
- [x] Env vars in `apps/web/.env.schema` + Vercel project env
- [x] `@bbrc/storage` client + presign + head + delete + key tests
- [x] API `storage.initUpload` / `storage.commitUpload` (+ admin `removeObject`)
- [x] Web `uploadFileToPresignedUrl` + Next `remotePatterns` for R2 host
- [ ] Smoke test against live bucket (`bun run --filter @bbrc/storage smoke`)

### Phase 2
- [x] Prisma migration (post, comment, shelf image fields)
- [x] Upload init/commit API for each image type
- [x] Avatar + post + comment + shelf UI
- [x] ISR revalidation on commit/remove
- [ ] Tests for image authZ (beyond key builder tests)

### Phase 3
- [x] Prisma `Document` model + migration
- [x] Document API + admin sheet + notifications
- [x] Book list icon + book detail section
- [x] New/edit document pages
- [x] Sitting page link
- [ ] Seed/fixtures for approved docs (optional)

---

## References in repo

- Book request flow: `packages/api/src/modules/book-request/`, `apps/web/src/components/blocks/admin-book-requests-sheet.tsx`
- Shelf forms (UX reference): `create-shelf-form.tsx`, `edit-shelf-form.tsx`
- User avatar display: `user-panel.tsx` (`User.image`)
- Shelf cover fallback: `shelf-cover.tsx`, `coverPreviewCoverIds`
