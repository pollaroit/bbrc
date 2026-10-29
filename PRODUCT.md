# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Turborepo monorepo: Next.js app (`apps/web`), oRPC API (`packages/api`), Prisma/Postgres (`packages/db`), shared packages (`packages/shared`, `packages/ui`). Deployed on Vercel (root `apps/web`). Local dev: `bun` + Turbo; auth via Better Auth; optional Telegram bot, ntfy push, Cloudflare R2 uploads, Upstash QStash cron.

## Users

Members of the Brigada friend group who read together as a club. Primary job: follow the club reading cycle (vote on the next book, read during a sitting, finish or DNF by deadline), track personal reading (shelves, goals, stats), and participate in community activity (posts, reviews, leaderboards). Admins curate the catalog, run sittings, and moderate. This is not a public or commercial product; access is for the closed group.

## Product Purpose

BBRC coordinates a parallel book club: a shared catalog, scheduled **sittings** with polls to pick one book, reading deadlines, member feedback and reviews, and lightweight social feed. Success means members reliably finish (or honestly DNF) club picks, leave useful feedback, and stay engaged between sittings without admin overhead dominating.

## Positioning

A sitting-centric reading club with enforced participation rules (warn/ban ladder for missed deadlines), dual progression (**XP** for activity, **RP** weighted by pages read or lost on DNF), and poll mechanics (including weighted chips tied to RP rank) that tie social competition directly to what the group reads next—not a generic Goodreads clone or public discovery site.

## Operating Context

- Club timezone defaults to **Asia/Baku** for poll/sitting deadline slots (cron-driven phase transitions).
- Books enter the catalog via admin add or member **Open Library** request flow.
- **Sitting** lifecycle: poll → reading → finished; one selected book per sitting.
- Participation: vote in poll, read by deadline, submit feedback when eligible; failure paths affect warn/ban and future participation.
- Surfaces include library browse, book/author detail, sittings, member profiles (reads, shelves, goals, stats, feedbacks), home feed, leaderboards, series, search, notifications (in-app + web push).

## Capabilities and Constraints

**Core capabilities (from codebase):** books catalog & discovery; sittings & polls; reads & shelves; favorites; feedback/reviews & comments; posts & likes; goals & user stats; XP/RP & leaderboards; series; documents/facts (admin); global search; author pages; admin tooling; optional Telegram announcements; PWA (Serwist).

**Constraints:**

- Closed, non-commercial membership model (see README).
- Secrets and env via **varlock** (`apps/web/.env.schema` → generated `env.ts`); do not commit `.env`.
- UI: **zero border radius** on product surfaces (sharp corners globally enforced).
- Production DB migrations run on Vercel build; Neon branch must match runtime `DATABASE_URL`.

**Open / undecided:** whether membership will stay strictly Brigada-only long term; formal accessibility compliance target (WCAG level) not documented in repo.

## Brand Commitments

- Name: **Brigada Book Reading Club**; short **BBRC**.
- Voice in app copy: plain, member-facing, club-local (not enterprise SaaS).
- Production site referenced in comms as **bbrc.club** (confirm DNS/deploy alias in ops, not duplicated here as legal fact).

## Evidence on Hand

- Product description and XP/RP rules: `README.md`.
- Realistic dev fixtures: `bun run db:seed` (development only; password documented in README).
- No committed customer logos, paid testimonials, or marketing benchmarks—future Persuade surfaces must not invent them.

## Product Principles

1. **The sitting is the spine.** Features should reinforce poll → read → review → next cycle, not scatter attention.
2. **Accountability is part of the game.** Deadlines, warnings, and RP/XP make participation legible without shame-only UX.
3. **Catalog truth is shared.** One club library; member requests and admin curation beat everyone maintaining private lists alone.
4. **Operate mode over marketing chrome.** Most UI is task completion for members who return weekly; clarity beats novelty.
5. **Ship real constraints.** Auth, moderation, cron, and env safety are product behavior, not implementation details to hide.

## Accessibility & Inclusion

No product-specific standard recorded in repository. Baseline expectation: semantic HTML, keyboard/focus for interactive UI, contrast aligned with existing design tokens. Confirm if a formal WCAG target is required for the club.
