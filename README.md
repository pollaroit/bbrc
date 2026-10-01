# Brigada Book Reading Club

A Book Reading Club for members of Brigada. This is a closed application, only for a friend group. This app is neither public nor commercial.

## Development database seed

Runs only when `NODE_ENV=development` (blocked in production). Resets app data and loads realistic fixtures: users, Open Library books, sittings, polls, participations, XP/RP events, feedback, and a home feed of posts (with comments and likes).

```bash
bun run db:seed
```

Every seeded account uses the same password: **`bbrcpwd1`** (see `SEED_PASSWORD` in `packages/db/src/seed/constants.ts`). Emails follow patterns like `admin_1@bbrc.test`, `warned_1@bbrc.test`, and `banned_1@bbrc.test` — see `packages/db/src/seed/users.ts` for the full list.

## Git hooks (Lefthook)

After `git init`, install hooks (also runs on `bun install` via `prepare`):

```bash
bun lefthook install
```

| Hook           | What runs                                                                        |
| -------------- | -------------------------------------------------------------------------------- |
| **pre-commit** | Biome on staged `*.{js,jsx,ts,tsx,mjs,cjs,json,jsonc,css}` (auto-fix + re-stage) |
| **commit-msg** | [Conventional Commits](https://www.conventionalcommits.org/) via `commitlint`    |
| **pre-push**   | `turbo run check-types`                                                          |

Commit messages follow `@commitlint/config-conventional` (`feat:`, `fix:`, optional scope, etc.). Override locally with an untracked `lefthook-local.yml` if needed.

## Deploying to Vercel

- Root directory: **`apps/web`**, with **include files outside root** enabled (monorepo).
- Install (override if needed): `cd ../.. && bun install --frozen-lockfile`
- Build: default **`bun run build`** in `apps/web` — runs `db:generate`, **`db:migrate:deploy`** (`prisma migrate deploy`), then Next.js. Migrations use env from Vercel only (never committed; same keys as `apps/web/.env.schema`).
- Set env vars in **Vercel → Settings → Environment Variables**: `DATABASE_URL` (pooled Neon URL for the app), **`DATABASE_URL_UNPOOLED`** (Neon direct URL for migrate deploy; strongly recommended), `BETTER_AUTH_*`, `CRON_SECRET`, optional `CLUB_TIMEZONE=Asia/Baku`. If `DATABASE_URL_UNPOOLED` is missing, deploy retries migrate and strips `-pooler` from the host automatically.
- **Cron:** `apps/web/vercel.json` hits `/api/cron/sittings` once daily at **16:00 UTC** (**20:00** club local in `Asia/Baku`) — closes due polls and finishes due sittings.
- That route closes due polls (winner = most votes, random tie-break) and finishes due reading sittings.

The app is simple. There are a list of books which can be added by admin (`user.isAdmin=true`), on each Sitting one book is selected on Poll, then participants read the book.

If they finish it they get XP, also can give feedback, if they cannot finish until deadline, they get "warned", (or if they are already warned, they get banned, which they won't be able to be participant on the next reading book, and won't be able to vote on poll).

### XP

XP (Experience Points) can be earned with these:

- When they participate in a sitting - `xp += 5`
- When they give feedback - `xp += 4 + feedback.review.length * 0.05`
- When they vote on a poll - `xp += 2`
- When they share a post - `xp += 4` (see `XP_AWARD.post` in `packages/api/src/modules/xp/xp.schema.ts`)
- When they comment - `xp += 1`
- When they request a book addition - `xp += 1`

### RP

Unlike XP (which focuses on the activity of a user), RP (Reading Points) focuses on the reading and unlike XP it can be reduced (gets minus).

- When the user completes a book `rp += book.pages / 10`
- When the user dnf'd a book `rp -= 1000 / book.pages`

Note: XP gets rounded to the nearest integer
