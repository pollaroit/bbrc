<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## UI: sharp corners by default

BBRC's own look has **zero border radius**, and members can choose rounder corners in Preferences (see "Theming" below). Do not hard-code radii (`rounded-[6px]`, `border-radius`); use the Tailwind `rounded-*` tokens only on shadcn-style components, which scale with the member's setting, and never `rounded-none` on plain boxes. See `packages/ui/src/styles/globals.css`.

## Environment (varlock)

- Schema: `apps/web/.env.schema` → generated `apps/web/src/env.ts`. Values: `apps/web/.env` (never commit).
- **New env var:** add to `.env.schema` and `turbo.json` `globalEnv` *before* `bun install` / `env:generate`. Root `postinstall` runs `scripts/guard-varlock-env.mjs` then `varlock codegen`.
- See `.cursor/rules/varlock-env.mdc`.

## Theming: tokens only

Members can pick a palette, fonts and text size (`/settings/preferences`), so UI code must not hard-code colours.

- Use semantic tokens: `bg-background`, `text-muted-foreground`, `border-border`, and for status or accent colours `success`, `warning`, `info`, `destructive`, `violet`, `pink` (each with an `-ink` text variant, for example `bg-info/10 text-info-ink`). Never use Tailwind palette classes such as `text-amber-600` or `dark:` colour overrides.
- Corner rounding is a member preference (none by default). Do not add `rounded-none`; use `rounded-md` or `rounded-lg` on shadcn-style components, or just a `border` on plain boxes (they follow the member's radius). Under "none" every element is squared by a global rule.
- Use text sizes from the Tailwind scale (`text-sm`, `text-2xs`, `text-3xs`), not arbitrary `text-[11px]`, so the member's text size applies.
- Palettes: Brigada is defined in `packages/shared/src/themes/palettes.ts`; the rest are tweakcn presets imported into `imported-palettes.ts` with `bun run themes:import` (see `THIRD_PARTY_NOTICES.md`). Fonts, radius and defaults live in `packages/shared/src/preferences.ts`. After editing palettes or preferences by hand, run `bun run themes:generate` (it writes `packages/ui/src/styles/palettes.css` and `appearance.css`). `bun test` in `packages/shared` fails if those files are stale or a palette misses a token or contrast.
- Check a new palette by eye at `/dev/themes`.

## Achievements

- Achievements are defined in code, in `packages/shared/src/achievements/definitions.ts` (one entry each: metric, thresholds, tiers, optional `isHidden`). Metrics live in `metrics.ts` and are pure functions over a snapshot of the member's activity (`AchievementFacts`), so they are unit-tested without a database. Adding an achievement is a new entry (and a new metric only if none fits).
- Only awards are stored (`UserAchievement`). They are sticky: removing a read later does not take a badge away. Admins can revoke an award; revoked awards are never re-awarded. Achievements are cosmetic (no XP).
- Awards are checked after the member's own actions through the `checkAchievementsAfter(...sections)` middleware on mutations (add it to any new mutation that changes activity), after a sitting changes phase, and by a daily sweep at `POST /api/cron/achievements` (schedule it in QStash; it also covers likes received, anniversaries and finished years).
- Use theme tokens for badge colours (see `achievement-badge.tsx`); `/dev/achievements` shows every card.

## Post polls and post settings

- A poll is part of a post (`PostPoll`, options and votes in `post-poll.prisma`); the post text is the question. A post with a poll has no image and no other attachment, and its text is required. Polls are created with the post (`post.create` takes `poll`) and cannot be added later.
- Types are single, multiple (min/max) and ranking (Borda points; the top position earns `maxChoices` points). Options are free text or one kind of thing (book, author, series, country, member): a poll uses one kind, and members who add options add the same kind. Authors and countries have no tables, so their options store a slug or code plus a name snapshot.
- Pure rules (visibility, ballot layers, tallies, setup validation) live in `packages/shared/src/post-polls.ts` and are unit-tested. Results visibility (everyone, voters, owner, after deadline) and ballot privacy (secret, turnout, owner, voters, public) are separate settings; ballots are never shown to someone who cannot see the results.
- Poll state is computed from the deadline and `closedAt`; there is no cron for closing. The "poll ended" notification is sent once, lazily when anyone reads the poll or by the daily `/api/cron/achievements` sweep.
- Every poll action updates the screen first (`apps/web/src/lib/poll/use-poll.ts`, `optimistic.ts`): add new actions there so feeds, the post page and the poll query stay in step (`syncPoll`).
- Posts have `allowLikes`, `allowComments`, `allowShares` (default true). The API refuses likes, comments and shares-in-posts when they are off; the UI hides the matching controls.
- Members can opt out of being used as a poll option (`allowPollOptions`, Preferences > Polls).

## Links in rich text

- A link is either inline (a `link` node inside a sentence) or a standalone preview card (an `embed` block, at most 3 per document, enforced in `validateRichDocument`). In the editor the card is the `linkCard` TipTap node (`apps/web/src/lib/tiptap-link-card.tsx`).
- On-site links are relative paths mapped to an `InternalLinkRef` (`internalLinkRefFromHref` never treats a full URL as on-site; the client turns same-origin URLs into paths first with `toSitePath`). Their previews come from one batched call, `linkPreview.resolve`, which hides drafts, hidden members and spoiler text.
- Outside links are https only and never fetched from the server: the card shows host and path, and pointing at an outside link says it opens another site.
- Render links with `RichInlineLink` and `LinkPreviewCard` / `ExternalLinkCard` rather than bare anchors, so hover previews and the "opens another website" cue stay consistent.

## Sitting joins

- A sitting has a join type: **public** (anyone, with a Join button and the feed card), **unlisted** (invitation link or QR code only) or **private** (organisers add people, or invite them to accept). Sittings that existed before joins were added are private; new ones default to public.
- Self-joining (button, link, QR) follows the sitting's join window: "voting" and "reading" can each be on, and reading closes after a percentage of the reading period (`readingJoinCutoff` in `packages/shared/src/sitting-joins.ts`). Organisers adding someone, and members accepting an invitation, ignore the window but never join a finished sitting.
- Members can leave only while voting. Someone an organiser removed (`removedAt`) cannot rejoin by themselves. Banned and hidden members cannot join.
- Invitation links (`SittingInviteLink`) have an optional label, expiry and use limit, count who opened them (once each) and who joined (`Participation.joinSource` and `inviteLinkId`). Claiming a use is one SQL statement so the last use cannot go to two people.
- Members can turn off "add me automatically" (`allowSittingAutoAdd`) and "invite me" (`allowSittingInvites`), both on by default. Organisers cannot add someone who opted out; they can invite them (accept/decline) unless invites are off too.
- Join notices to organisers are grouped into one notification per sitting for a few hours. Add any new join path through `addParticipation`/`afterJoin` in `sitting-join.service.ts` so XP, welcome and organiser notices stay consistent.

## Views and insights

- One polymorphic `View` table (resource = book, post, shelf, review, user; id stored as a plain string, no foreign key). Rows are written by `POST /api/views` (`apps/web/src/app/api/views/route.ts` → `recordViews`), never by page renders, because book and sitting pages are cached.
- The browser side lives in `apps/web/src/lib/views/` (`tracker.ts`): views are queued, de-duplicated per item and kind for 30 minutes for the whole browser session (so moving between the tabs of a book or profile sends nothing) and sent in batches. Detail pages use `TrackDetailView` from a layout, list cards use `useImpressionRef` / `TrackImpression` with a `source`.
- Rules (pure helpers and constants in `packages/shared/src/views.ts`): bots are dropped by user agent and counted in `ViewBotDay`; the same viewer counts once per item and kind per 30 minutes; the owner's own views are stored with `isOwner` and left out of every number; draft shelves and hidden members are not tracked.
- Raw rows are kept 90 days. The daily sweep (`sweepViews`, called from `/api/cron/achievements`) sums older days into `ViewDaily` (views by day and breakdown) and `ViewDailyUnique` (distinct viewers per day), deletes the raw rows in the same transaction, removes rows of deleted items and sends the Monday digest. `ViewerSeen` keeps signed-in viewers forever (exact unique members, new vs returning, top viewers). `ViewTotal` holds running totals for public counts.
- Insights (`orpc.view.insights`): posts, reviews and shelves are for the author (shelf collaborators too) and admins, who see names of signed-in viewers; books are open to any signed-in member (aggregates only); a member sees anonymous aggregates on their own profile and only admins see who viewed it. Public "N views" labels exist on posts and books only.
- Milestones (100, 500, 1k, 5k, 10k opens) notify the owner once (`view_milestone`); `views_digest` goes out on Mondays (club time). Views-based achievements read `ViewTotal`.
- Add a new surface by calling the tracker with the right `source` (see `VIEW_SOURCES`); add a new kind of item in `resolveTargets` and `describeViewTarget` in `view.service.ts`.
