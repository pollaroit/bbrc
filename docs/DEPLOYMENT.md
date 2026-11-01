# Deployment

Production runs on **Vercel** (`apps/web`) with **Neon** Postgres. Env var names and types: `apps/web/.env.schema`.

## Vercel project settings

- **Root directory:** `apps/web`
- **Include files outside root:** enabled (monorepo)
- **Install** (override if needed): `cd ../.. && bun install --frozen-lockfile`
- **Build:** `bun run build` in `apps/web` — runs `db:generate`, `db:migrate:deploy`, then Next.js. Root `turbo run build` runs `@bbrc/db#db:migrate:deploy` before `web#build` (uncached) so schema is applied before static generation.

## Environment variables

Set in **Vercel → Settings → Environment Variables** (never commit values):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Pooled Neon URL for runtime |
| `DATABASE_URL_UNPOOLED` | Direct URL for migrations (same branch/DB as pooled) |
| `BETTER_AUTH_*` | Secret + public URL |
| `CRON_SECRET` | Optional Bearer for cron route |
| `CLUB_TIMEZONE` | e.g. `Asia/Baku` |
| `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | Required for cron routes (QStash signature verify) |
| `QSTASH_TOKEN`, `QSTASH_URL` | Optional; REST/scripts only. If set in Vercel, also list them in root `turbo.json` → `globalEnv` (Turbo omits undeclared vars during `web#build`). |

If `DATABASE_URL_UNPOOLED` is missing or points at a different branch, deploy warns and migrates via direct `DATABASE_URL` instead.

## Static generation at build (ISR warm limit)

Detail pages (books, authors, posts, sittings, public profiles) use **ISR** (`revalidate = 3600`, `dynamicParams = true`). They do **not** need to be fully prerendered on every deploy.

- **`ISR_BUILD_WARM_LIMIT`** (Vercel env, default **`0`**): max detail URLs to prerender during `next build`. `0` means **on-demand only** — first request (or `revalidatePath` after a mutation) generates HTML. Set e.g. `100`–`200` if you want a small warm set of recently updated pages on each deploy.
- **Book and author tabs:** only the **overview** route participates in build warm-up; other tabs are `force-dynamic` and render on demand (same SEO when crawled, faster deploys).
- **Posts at build** use the same visibility filter as the public sitemap (not every row in the database).
- **Sitting vote** is never multiplied at build (only `/sittings/[slug]` may be warmed).

Existing `revalidateIsr.*` calls after mutations are unchanged.

## Migrations

- Deploy runs `db:migrate:deploy` during build.
- **`P2022` / missing columns at runtime:** ensure Build and Production use the same Neon branch; run `bun run db:migrate:deploy` locally once with production env if needed.
- **Empty Neon UI but live site has data:** you are likely on a different branch than Vercel’s `DATABASE_URL`. Compare host/db in Neon with Production env; build logs `[db:migrate:deploy] target host/db`.

## Cron (sittings & polls)

[Upstash QStash](https://upstash.com/docs/qstash) schedule: `0 10,13,16,19 * * *` (UTC) → `POST /api/cron/sittings` four times daily (**14:00, 17:00, 20:00, 23:00** club local when `CLUB_TIMEZONE=Asia/Baku`).

Hourly schedule: `0 * * * *` (UTC) → `POST /api/cron/posts` publishes due scheduled posts (and will later send event reminders in PR 15).

- Auth: `Upstash-Signature` (+ optional `Authorization: Bearer CRON_SECRET`)
- Closes due polls (winner = most votes, random tie-break) and finishes due reading sittings

## Git hooks (local)

Hooks install on `bun install` (`prepare`). Manual: `bun lefthook install`.

| Hook | Action |
|------|--------|
| pre-commit | Biome on staged files |
| commit-msg | Conventional Commits (`commitlint`) |
| pre-push | `turbo run check-types` |

Override locally with untracked `lefthook-local.yml` if needed.
