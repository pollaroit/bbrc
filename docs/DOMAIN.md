# Product domain

High-level behavior of the reading club app. For implementation details, search the codebase (`packages/api`, `apps/web`).

## Core loop

- Admins maintain the **book catalog** (`user.role = super_admin`).
- A **Sitting** is a reading period; members pick the next book via a **Poll**.
- Participants read the book before the sitting deadline.
- **Feedback** and social features (posts, comments, goals, etc.) sit on top of reads and sittings.

## Participation outcomes

- **Finished** on time: earn XP and Reading Points (RP); can submit feedback.
- **Did not finish** by deadline: costs reading points (RP). There is no warning or ban for now; a fuller system will come later.

Exact formulas and edge cases live in API modules (e.g. participation, XP/RP services).

## XP (Experience Points)

Activity-focused; values are rounded to integers. Examples (see `packages/api/src/modules/xp/xp.schema.ts` for awards):

| Action | XP |
|--------|-----|
| Participate in a sitting | +5 |
| Give feedback | +4 + `0.05 × review length` |
| Vote on a poll | +2 |
| Share a post | +4 |
| Comment | +1 |
| Request a book addition | +1 |
| Create a reading goal | +3 |

## RP (Reading Points)

Reading-focused; can **decrease** unlike XP.

| Outcome | RP |
|---------|-----|
| Complete a book | + `pages / 10` |
| DNF a book | − `1000 / pages` |

## Local seed data

Development seed (`bun run db:seed`, `NODE_ENV=development` only) loads fixtures: users, books, sittings, polls, participations, XP/RP events, feedback, and feed posts.

- Password: **`bbrcpwd1`** (`SEED_PASSWORD` in `packages/db/src/seed/constants.ts`)
- Emails: patterns like `admin_1@bbrc.test` (super admin), `admin_2@bbrc.test` (admin), `moderator_1@bbrc.test`, `member_1@bbrc.test` — full list in `packages/db/src/seed/users.ts`
