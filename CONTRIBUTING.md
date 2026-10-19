# Contributing to BBRC

Thank you for helping build the Brigada Book Reading Club app. BBRC is a **private, members-only** product; this repository is for invited contributors. Production hosting, secrets, and merges to `main` stay with the **project owner**.

## Workflow (required)

We do **not** push directly to `main`.

1. **Branch** from the latest `main`:

   ```bash
   git fetch origin
   git checkout main
   git pull origin main
   git checkout -b feat/short-description
   ```

   Use prefixes such as `feat/`, `fix/`, `chore/`, or `docs/`.

2. **Implement** with small, focused commits ([Conventional Commits](#commits-and-hooks)).

3. **Open a pull request** into `main`. Fill out the PR template (summary, test plan, migration notes).

4. **Review**: the owner (`@pollaroit`) is the **code owner** for the whole repo. Every PR needs **owner approval** before merge.

5. **Merge**: only the owner merges (squash or merge commit — team preference). Contributors do not merge their own PRs unless the owner explicitly asks.

6. **Deploy**: production deploys from `main` (Vercel). You do not need deploy access to contribute code.

## Prerequisites

| Tool                  | Version / notes                                                    |
| --------------------- | ------------------------------------------------------------------ |
| [Bun](https://bun.sh) | `1.3.x` (see root `packageManager` in `package.json`)              |
| Git                   | Lefthook hooks install on `bun install`                            |
| PostgreSQL            | **Neon** (recommended) or any Postgres compatible with Prisma      |
| Optional              | [Neon CLI](https://neon.tech/docs/reference/neon-cli) for branches |

Node.js is not required when using Bun for install and scripts.

## First-time setup

### 1. Clone and install

```bash
git clone git@github.com:pollaroit/bbrc.git
cd bbrc
bun install
```

`postinstall` runs Varlock codegen and validates env keys against schemas.

### 2. Environment variables

Secrets are **never** committed.

| Location                  | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| `apps/web/.env`           | Next.js app runtime (gitignored)                   |
| `apps/web/.env.schema`    | **Source of truth** for web env names and types    |
| `packages/db/.env`        | Usually mirrors `DATABASE_*` from web (gitignored) |
| `packages/db/.env.schema` | Imports DB-related keys from web schema            |

**Adding a new env var**

1. Declare it in `apps/web/.env.schema` (with comments and types).
2. Add the name to `turbo.json` → `globalEnv` if the app reads it at build/runtime on Vercel.
3. Put the value in your local `apps/web/.env`.
4. Run `bun run env:generate` (or `bun install`).

Do **not** hand-edit `apps/web/src/env.ts` — it is generated.

For a fresh Neon database, set at minimum:

- `DATABASE_URL` — pooled connection string
- `DATABASE_URL_UNPOOLED` — direct URL (recommended for migrations)
- `BETTER_AUTH_SECRET` — long random string
- `BETTER_AUTH_URL` — e.g. `http://localhost:3001` locally

See `apps/web/.env.schema` for cron, QStash, Telegram, R2, and other optional integrations. Local dev can leave many optional vars empty.

**Pull env from Vercel** (if the owner shared project access):

```bash
cd apps/web && vercel env pull .env
```

### 3. Database

Generate the client and apply migrations:

```bash
bun run db:generate
bun run db:migrate:deploy
```

Interactive migration authoring (owners / DB changes):

```bash
bun run db:migrate
```

Development seed ( **development only** — blocked in production):

```bash
bun run db:seed
```

Default seeded password: **`bbrcpwd1`** (see `packages/db/src/seed/constants.ts`). Account emails are listed in `packages/db/src/seed/users.ts`.

Other useful commands:

```bash
bun run db:studio    # Prisma Studio
# WARNING!!! DO NOT USE db:push, it will override the schema and migrations.
bun run db:push      # prototype schema without migration (use carefully)
```

### 4. Run the app

```bash
bun run dev:web
```

Web app: [http://localhost:3001](http://localhost:3001) (`apps/web`).

Full monorepo dev (all packages that define `dev`):

```bash
bun run dev
```

Browser extension (if you work on it):

```bash
cd apps/extension && bun run dev
```

## Repository layout

Turborepo monorepo (`bun` workspaces):

| Path               | Package         | Role                                   |
| ------------------ | --------------- | -------------------------------------- |
| `apps/web`         | `web`           | Next.js UI, API routes, cron handlers  |
| `apps/extension`   | `extension`     | Browser extension                      |
| `packages/api`     | `@bbrc/api`     | oRPC modules, business logic           |
| `packages/db`      | `@bbrc/db`      | Prisma schema, migrations, seed        |
| `packages/auth`    | `@bbrc/auth`    | Better Auth configuration              |
| `packages/ui`      | `@bbrc/ui`      | Shared UI components and global styles |
| `packages/schemas` | `@bbrc/schemas` | Shared Zod / generated types           |
| `packages/shared`  | `@bbrc/shared`  | Shared utilities                       |
| `packages/storage` | `@bbrc/storage` | Object storage helpers                 |
| `packages/config`  | `@bbrc/config`  | Shared TS/Biome config                 |

Product domain: [docs/DOMAIN.md](./docs/DOMAIN.md). Storage design: [docs/SPEC.md](./docs/SPEC.md). Deployment: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md). Repo index: [README.md](./README.md).

## Scripts (root)

| Script                  | Description                          |
| ----------------------- | ------------------------------------ |
| `bun run dev`           | Turbo dev for all apps               |
| `bun run dev:web`       | Web only on port 3001                |
| `bun run build`         | Production build (Turbo)             |
| `bun run check-types`   | Typecheck all packages               |
| `bun run check`         | Biome check + write                  |
| `bun run db:*`          | Database tasks (see above)           |
| `bun run env:generate`  | Regenerate Varlock `env.ts` files    |
| `bun run auth:generate` | Regenerate Better Auth Prisma schema |

## Commits and hooks

[Lefthook](https://github.com/evilmartians/lefthook) runs automatically after `bun install`:

| Hook           | Action                                                                      |
| -------------- | --------------------------------------------------------------------------- |
| **pre-commit** | Biome on staged files (fix + re-stage)                                      |
| **commit-msg** | [Conventional Commits](https://www.conventionalcommits.org/) via commitlint |
| **pre-push**   | `turbo run check-types`                                                     |

Examples: `feat: add export for reads`, `fix(web): focus trap in sheet`, `chore: bump turbo`.

## Pull request checklist

- Branch is up to date with `main` (rebase or merge as you prefer).
- `bun run check-types` passes locally (also runs on pre-push).
- UI changes: note screenshots or a short screen recording in the PR.
- **Migrations**: call out in the PR; owner applies deploy migrations on merge.
- **New env vars**: schema + `turbo.json` + note for owner to set Vercel values.
- No secrets, `.env`, or member data in the diff.

## UI conventions

- **No border radius** on UI surfaces — sharp corners only (see `.cursor/rules/no-border-radius.mdc` and `packages/ui` globals).
- Prefer existing listing/toolbar patterns under `apps/web/src/components/listing/`.

## Labels and automation

On each PR, GitHub Actions apply:

- **Area labels** from `.github/labeler.yml` (web, api, db, ui, …)
- **Size labels** (`size/XS` … `size/XL`) from changed line counts

Issue templates apply `type: bug` and `type: feature`.

## GitHub setup (maintainers)

Do this once on **github.com/pollaroit/bbrc** so the workflow above is enforced.

### 1. Default branch and collaborators

- Default branch: **`main`**
- **Settings → Collaborators**: invite contributors with **Write** access (they can push branches and open PRs, not bypass protection if configured correctly).

### 2. Branch protection for `main`

**Settings → Branches → Add branch protection rule** (or ruleset):

| Setting                                    | Recommendation                                                  |
| ------------------------------------------ | --------------------------------------------------------------- |
| Require a pull request before merging      | On                                                              |
| Required approvals                         | **1**                                                           |
| Require review from Code Owners            | **On** (uses `.github/CODEOWNERS` → `@pollaroit`)               |
| Dismiss stale pull request approvals       | Optional (on if you want re-review after big pushes)            |
| Require status checks                      | Add when CI exists; until then rely on local pre-push typecheck |
| Require conversation resolution            | On (optional)                                                   |
| Restrict who can push to matching branches | **Only the owner** (or allow no one direct push except admins)  |
| Allow force pushes                         | **Off**                                                         |
| Allow deletions                            | **Off**                                                         |

Effect: contributors **cannot** merge or push to `main`; only you approve and merge.

### 3. Repository labels

Create labels (or let the labeler workflow create them on first PR with `sync-labels: true`):

**Areas:** `area: web`, `area: extension`, `area: api`, `area: db`, `area: ui`, `area: auth`, `area: shared`, `area: infra`, `area: docs`

**Types:** `type: bug`, `type: feature`, `type: dependencies`, `database: migration`

**Sizes:** `size/XS`, `size/S`, `size/M`, `size/L`, `size/XL`

### 4. GitHub Actions

Ensure **Settings → Actions → General → Workflow permissions** allows read/write for PRs (labeler needs `pull-requests: write`).

Workflow file: `.github/workflows/labeler.yml` (runs on `pull_request`).

### 5. Community health files

| File                 | Purpose                         |
| -------------------- | ------------------------------- |
| `CONTRIBUTING.md`    | This guide                      |
| `CODE_OF_CONDUCT.md` | Community standards             |
| `SECURITY.md`        | Private vulnerability reporting |
| `LICENSE`            | MIT                             |
| `.github/CODEOWNERS` | Required owner review           |

In **Settings → General**, optionally enable **Issues** and link the Code of Conduct.

### 6. Optional next steps

- Add a **CI workflow** (Biome + `check-types` on PR) and require that check in branch protection.
- Enable **Dependabot** for `bun` / GitHub Actions if you want automated dependency PRs.
- Add a **CONTRIBUTING** link in the repo **About** section on GitHub.

## Questions

Open a **Feature request** or **Bug report** issue, or ask in the club dev channel. For access, env values, or production incidents, contact the owner directly — not in public issues.
