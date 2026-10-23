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
