<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## UI: no border radius

BBRC uses **zero border radius** on all UI. Do not add `rounded-*` (except cleanup to `rounded-none`), `border-radius`, or curved tokens. See `.cursor/rules/no-border-radius.mdc` and `packages/ui/src/styles/globals.css`.

## Environment (varlock)

- Schema: `apps/web/.env.schema` → generated `apps/web/src/env.ts`. Values: `apps/web/.env` (never commit).
- **New env var:** add to `.env.schema` and `turbo.json` `globalEnv` *before* `bun install` / `env:generate`. Root `postinstall` runs `scripts/guard-varlock-env.mjs` then `varlock codegen`.
- See `.cursor/rules/varlock-env.mdc`.

## Theming: tokens only

Members can pick a palette, fonts and text size (`/settings/preferences`), so UI code must not hard-code colours.

- Use semantic tokens: `bg-background`, `text-muted-foreground`, `border-border`, and for status or accent colours `success`, `warning`, `info`, `destructive`, `violet`, `pink` (each with an `-ink` text variant, for example `bg-info/10 text-info-ink`). Never use Tailwind palette classes such as `text-amber-600` or `dark:` colour overrides.
- Use text sizes from the Tailwind scale (`text-sm`, `text-2xs`, `text-3xs`), not arbitrary `text-[11px]`, so the member's text size applies.
- Palettes live in `packages/shared/src/themes/palettes.ts`; fonts and defaults in `packages/shared/src/preferences.ts`. After editing either, run `bun run themes:generate` (it writes `packages/ui/src/styles/palettes.css` and `appearance.css`). `bun test` in `packages/shared` fails if those files are stale or a palette misses a token or contrast.
- Check a new palette by eye at `/dev/themes`.
