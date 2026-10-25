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
- Raw rows are kept 90 days. The daily sweep (`sweepViews`, called from `/api/cron/achievements`) sums older days into `ViewDaily` (views by day and breakdown) and `ViewDailyUnique` (distinct viewers per day), deletes the raw rows in the same transaction, removes rows of deleted items and sends the Monday digest. `ViewerSeen` keeps signed-in viewers forever (exact unique members, new vs returning, top viewers). `ViewTotal` holds running totals (opens, list impressions, distinct viewers) for public counts; books and shelves keep a copy (`viewCount`, `viewerCount`) so lists can sort by it, and the daily sweep heals any drift.
- Insights (`orpc.view.insights`): posts, reviews and shelves are for the author (shelf collaborators too) and admins, who see names of signed-in viewers; books are open to any signed-in member (aggregates only); a member sees anonymous aggregates on their own profile and only admins see who viewed it. Public "N views" labels exist on posts and books only.
- Milestones (100, 500, 1k, 5k, 10k opens) notify the owner once (`view_milestone`); `views_digest` goes out on Mondays (club time). Views-based achievements read `ViewTotal`.
- Add a new surface by calling the tracker with the right `source` (see `VIEW_SOURCES`); add a new kind of item in `resolveTargets` and `describeViewTarget` in `view.service.ts`.

## Adding books

- **Pages:** `/books/new` (admins) is `AddBookFlow`, `/books/request` (members) is `RequestFlow`, both in `apps/web/src/components/blocks/book-flow/`. The search state (`useBookSearch`) lives in the flow, so results stay behind the form and `[` / `]` can switch to the neighbouring result. Add and Request share `BookFinder`, `BookPreviewCard`, `HotkeyHintBar` and the "After adding" options; the edit page reuses `BookWorkspace` (preview + sections + sticky action bar; a phone gets an accordion).
- **Finding a book:** the search bar accepts a title, an Open Library work or edition link, a Goodreads link (searched by the title in the address) or an ISBN-10/13 (checksum checked). The parser is `parseBookLookup` in `packages/shared/src/book-lookup.ts`. On phones that support `BarcodeDetector` there is a "Scan ISBN" button.
- **Queue:** several results can be ticked, or titles pasted one per line (admins), and reviewed one by one. It lives in `sessionStorage` (this browser only). A queue goes on to its next book after saving, whatever "After saving" says.
- **Hotkeys** (one typed list in `use-book-flow-hotkeys.ts` drives the listener, the hint bar, the `?` cheat sheet and the key chips; chips are hidden on touch devices): `/` search, `↑` `↓` move, `Enter` pick, `[` `]` previous/next book while the form is open, `Esc` back, `Ctrl/⌘+Enter` save, `Ctrl/⌘+Shift+Enter` save and next, `?` help. **Collision rules:** single keys only fire when you are not typing in a field, no dialog/menu/popover is open and no Ctrl/⌘/Alt is held; auto-repeat and IME composition are ignored; never use `D` (theme), `K` / `Ctrl+K` (search), `U` or any Ctrl/⌘ + letter or digit (browsers and the rich text editor own those). The only Ctrl/⌘ combos are Enter and Shift+Enter.
- **Covers:** `Book.coverId` above zero is an Open Library cover; **below zero** is a cover an admin uploaded (the file URL is `Book.customCoverUrl`, served at `/api/covers/<-coverId>`). `bookCoverUrl(coverId)` handles both, so screens never need to know. Uploaded covers are cropped in the browser to a fixed 2:3, 600×900 WebP and uploaded with the `book-cover` direct upload target; the API only accepts URLs under our own storage's `books/covers/`. Every upload gets a new id, so the cover route is cached forever.
- **Series places:** `SeriesBook.position` is a number: whole numbers, or one decimal (1.5) for a novella or prequel. Adding or moving a book takes `seriesPosition` and `shiftLater` (`placeBookInSeries`): a taken whole number can push later books down by one, a half step never moves anything and fails if taken. Removing a book renumbers only when the series has no half steps; reordering by drag renumbers to whole numbers.
- **Requests:** a request can carry a note (200 chars); members say "me too" (`BookRequestUpvote`, one per member, not for your own request, no points). `bookRequest.listOpen` ranks pending requests by "me too". When an admin adds a book, everyone who asked or said "me too" is told; "Notify members" off tells only them. Admins decline with preset reasons; requests older than 90 days are flagged stale, never deleted.
- **Discover** (`bookDiscover.lanes` / `lane`): admins get Members want this, Next in a series, Authors the club rates highly, Fills a gap and Ask AI; members get Suggested for you (their own reads, ratings and favorites) and Ask AI. Lane results are cached in `BookDiscoverCache` (6 h; AI 24 h) and dropped when a work is blocked or unblocked. **AI rule:** only a compact taste summary (top authors/subjects, counts per country and decade, a few most-read and best-rated titles; about 700 tokens) is sent, never the catalog. Books the library already has are removed in code afterwards, and every pick is verified against Open Library. It runs only on click; members get 3 asks a day (`BookDiscoverAsk`), cached answers are free. **Never block the page:** the browser keeps only about 6 connections open to the site (the book search itself goes through `/api/open-library/*`), so slow lanes would freeze header links, search and buttons. The panel fetches only the open lane (others load when their tab is opened, `retry: false`), and every server lane has an 8 s Open Library budget (`searchWithin`): late searches are skipped, the lane says Open Library is slow, and an incomplete lane is not cached.
- **Prefill help:** pages come from the median of the editions (`pagesFromEditions`), `book.findSimilar` warns about a book already in the library under another Open Library id (similar title and an author), and `book.suggestDetails` drafts a description and subjects on request (nothing is filled automatically).

## Reading, wishlist and editions

- **Reading** (`Reading`, `ReadingLog`): a member reading a book right now. One unfinished session per member and book (partial unique index), at most 5 at once (`MAX_ACTIVE_READINGS`). Progress is `percent` (always) plus `currentPage`/`totalPages` when the pages are known; every update is logged for pace, streaks and finish times. **Abandoning deletes the session** (and its log); finishing happens only by marking the book read (`finalizeReadingForRead`, called from `setRead` and `ensureUserReadBook`), which also removes the book from the wishlist and carries the edition to the `Read`. Finished sessions stay for stats.
- **Sitting sync** (`reading.service.ts`): starting a reading sets the member's participation `in_progress` on a reading-phase sitting whose pick is that book; abandoning sets it back to `not_started`; setting "in progress" on the sitting starts a reading; a sitting entering its reading phase picks up existing readings. Add any new way to change either side through these helpers.
- **Wishlist** is a special shelf (`Shelf.isWishlist`, one per member by a partial unique index, private and ordered by default). It is created by the migration for existing members, by the sign-up hook in `packages/auth`, and lazily by `ensureWishlistShelf`. It cannot be deleted, renamed, retyped, re-covered or shared; only its description and visibility change. The slug `wishlist` is reserved. Shelves have `visibility` (public/private) on top of status; use `publicShelfWhere` / `visibleShelfWhere` (`shelf/shelf-visibility.ts`) for every shelf read. Normal shelf lists never include the wishlist. Wishlist counts shown on book pages are counts only, never names.
- **Privacy** (Preferences): "Keep my wishlist private" (the wishlist shelf's visibility), `showCurrentlyReading` and `showReadingProgress` on `User`, all on by default. Lists of readers and profiles respect them; counts include everyone.
- **Editions** have two sources: Open Library (fetched live, the picked one is stored as `editionOlid` plus a label/cover snapshot) and member-added `BookEdition` rows (5 per member per day, ISBN-13 unique per book, admins verify/merge/delete). `Read` and `Reading` carry either.
- **Pace and reminders**: `readingPace` / `readingStats` in `packages/shared` are pure and tested. The opt-in `reading_behind` notification is off by default (`NOTIFICATION_KINDS_OFF_BY_DEFAULT`); the daily sweep (`sweepReadingReminders`, inside `/api/cron/achievements`) sends at most one per member and book every 2 days.
- Book list counters `readingNowCount` / `wishlistCount` are kept by `recomputeBookReadingCounters` and healed by the daily sweep.

## Edition pages

- Address: `/books/<slug>/editions/<key>`. The key is an Open Library edition id (`OL123M`), `m-<8 chars>` for a member-added edition (`BookEdition.publicId`), or an ISBN alias (`isbn-<digits>`) that redirects. Parse and build keys only with `packages/shared/src/edition-key.ts` (`parseEditionKey`, `canonicalEditionKey`). A member edition linked to an Open Library edition (`openLibraryOlid`) uses the Open Library address, and readers of both share that page.
- Data (`packages/api/src/modules/edition/`): `edition.get` is public and cacheable (no names except a member edition's creator and review authors); `edition.readers` gives names only to signed-in members and follows the reading privacy settings; `edition.viewer` is the signed-in member's actions. Open Library data is fetched live through the cached helpers; an `EditionSnapshot` is saved for editions members use and is the fallback when Open Library is slow. Deleting or merging a member edition writes an `EditionTombstone` (old address redirects or shows "removed"), and readings keep a saved label and cover.
- Reviews belong to the book, not the edition: the page shows the book's reviews by members who read that edition and the average they gave the book.
- External links come from `editionExternalLinks` in `packages/shared` and stay free: Open Library, Internet Archive (direct item when Open Library knows one), WorldCat, Google Books preview, Goodreads, LibraryThing, Library of Congress.
- SEO: `generateMetadata`, `editionJsonLd` + breadcrumbs, a dedicated OG card, sitemap entries for editions members use; removed pages and redirects are noindex.
- Every place an edition is named links to its page (`EditionChip`, `editionHref`).
