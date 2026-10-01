import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";
import "varlock/auto-load";

import {
	neonDatabaseTarget,
	resolveMigrateDatabaseUrl,
} from "../src/migrate-database-url";

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const maxAttempts = 3;
const retryDelayMs = 8_000;

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function runMigrateDeploy(): number {
	const result = spawnSync("bunx", ["prisma", "migrate", "deploy"], {
		cwd: packageRoot,
		stdio: "inherit",
		env: {
			...process.env,
			DATABASE_URL: resolveMigrateDatabaseUrl(),
		},
	});

	return result.status ?? 1;
}

/** Fail the deploy if Prisma thinks migrations ran but expected columns are missing. */
async function assertParticipationSoftRemoveColumn(): Promise<void> {
	const sql = neon(resolveMigrateDatabaseUrl());
	const rows = await sql`
		SELECT 1 AS ok
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'participation'
			AND column_name = 'removed_at'
		LIMIT 1
	`;

	if (rows.length === 0) {
		console.error(
			"Schema verification failed: public.participation.removed_at is missing after migrate deploy. " +
				"Run prisma migrate deploy against production (DATABASE_URL_UNPOOLED) or repair the column manually.",
		);
		process.exit(1);
	}
}

function assertRuntimeAndMigrateSameDatabase(): void {
	const migrateUrl = resolveMigrateDatabaseUrl();
	const migrateTarget = neonDatabaseTarget(migrateUrl);
	console.info(`[db:migrate:deploy] target ${migrateTarget}`);

	const runtimeUrl = process.env.DATABASE_URL?.trim();
	if (!runtimeUrl) {
		return;
	}

	const runtimeTarget = neonDatabaseTarget(runtimeUrl);
	if (runtimeTarget !== migrateTarget) {
		console.error(
			`[db:migrate:deploy] DATABASE_URL (${runtimeTarget}) and the migrate URL (${migrateTarget}) point at different databases. ` +
				"Deploy may apply migrations to an empty Neon branch while the app serves another (P2022 / empty Tables UI). Align Vercel Production and Build env vars.",
		);
		process.exit(1);
	}
}

async function main() {
	assertRuntimeAndMigrateSameDatabase();

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const exitCode = runMigrateDeploy();
		if (exitCode === 0) {
			await assertParticipationSoftRemoveColumn();
			return;
		}

		if (attempt < maxAttempts) {
			console.warn(
				`migrate deploy failed (attempt ${attempt}/${maxAttempts}); retrying in ${retryDelayMs / 1000}s…`,
			);
			await sleep(retryDelayMs);
		} else {
			process.exit(exitCode);
		}
	}
}

await main();
