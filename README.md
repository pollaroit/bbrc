# BBRC (Brigada Book Reading Club)

Private monorepo for the Brigada reading club web app and related packages. Invited contributors only; production is operated by the project owner.

## Start here

| If you want to… | Read |
|-----------------|------|
| Set up locally, branch/PR workflow, scripts, env & database | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| Club features, sittings, XP/RP rules (product domain) | [docs/DOMAIN.md](./docs/DOMAIN.md) |
| Deploy to Vercel, Neon, cron, troubleshooting | [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) |
| R2 uploads, documents, storage design | [docs/SPEC.md](./docs/SPEC.md) |
| Report a security issue | [SECURITY.md](./SECURITY.md) |
| Community expectations | [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) |
| License | [LICENSE](./LICENSE) |

**Quick local run** (after [CONTRIBUTING.md](./CONTRIBUTING.md) env + DB steps):

```bash
bun install
bun run db:generate && bun run db:migrate:deploy
bun run dev:web
```

App: [http://localhost:3001](http://localhost:3001)

## Repository map

| Path | What it is |
|------|------------|
| [`apps/web`](./apps/web) | Next.js app (UI, API routes, cron) |
| [`apps/extension`](./apps/extension) | Browser extension |
| [`packages/api`](./packages/api) | oRPC API modules and business logic |
| [`packages/db`](./packages/db) | Prisma schema, migrations, seed |
| [`packages/auth`](./packages/auth) | Better Auth |
| [`packages/ui`](./packages/ui) | Shared UI components and styles |
| [`packages/schemas`](./packages/schemas) | Shared Zod / generated types |
| [`packages/shared`](./packages/shared) | Shared utilities |
| [`packages/storage`](./packages/storage) | Object storage helpers |
| [`packages/config`](./packages/config) | Shared tooling config |
| [`.github`](./.github) | PR/issue templates, labeler, CODEOWNERS |

Stack: **Bun**, **Turborepo**, **Next.js**, **Prisma** (Neon Postgres), **Better Auth**, **oRPC**.

## Contributing

All changes land on `main` through **owner-approved pull requests** — no direct pushes. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [.github/CODEOWNERS](./.github/CODEOWNERS).
