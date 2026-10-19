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
| `QSTASH_*` | Upstash QStash (see schema) |

If `DATABASE_URL_UNPOOLED` is missing or points at a different branch, deploy warns and migrates via direct `DATABASE_URL` instead.

## Migrations

- Deploy runs `db:migrate:deploy` during build.
- **`P2022` / missing columns at runtime:** ensure Build and Production use the same Neon branch; run `bun run db:migrate:deploy` locally once with production env if needed.
- **Empty Neon UI but live site has data:** you are likely on a different branch than Vercel’s `DATABASE_URL`. Compare host/db in Neon with Production env; build logs `[db:migrate:deploy] target host/db`.

## Cron (sittings & polls)

[Upstash QStash](https://upstash.com/docs/qstash) schedule: `0 10,13,16,19 * * *` (UTC) → `POST /api/cron/sittings` four times daily (**14:00, 17:00, 20:00, 23:00** club local when `CLUB_TIMEZONE=Asia/Baku`).

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
