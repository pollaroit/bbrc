import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "varlock/auto-load";

import { ENV } from "../src/env.js";
import { createPrismaClient } from "../src/index.js";
import { resolveMigrateDatabaseUrl } from "../src/migrate-database-url.js";
import { assertDevSeedEnvironment } from "../src/seed/assert-dev.js";
import { resetDatabase } from "../src/seed/reset.js";

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const FAILED_MIGRATION = "20261002193000_book_olid_required";

function runPrisma(args: string[]): number {
	const result = spawnSync("bunx", ["prisma", ...args], {
		cwd: packageRoot,
		stdio: "inherit",
		env: {
			...process.env,
			DATABASE_URL: resolveMigrateDatabaseUrl(),
		},
	});

	return result.status ?? 1;
}

async function main() {
	assertDevSeedEnvironment();

	console.log("Clearing all application data…");
	const db = createPrismaClient({ DATABASE_URL: ENV.DATABASE_URL });
	try {
		await resetDatabase(db);
	} finally {
		await db.$disconnect();
	}

	console.log(`Marking failed migration as rolled back: ${FAILED_MIGRATION}`);
	if (
		runPrisma(["migrate", "resolve", "--rolled-back", FAILED_MIGRATION]) !== 0
	) {
		process.exit(1);
	}

	console.log("Applying pending migrations…");
	if (runPrisma(["migrate", "deploy"]) !== 0) {
		process.exit(1);
	}

	console.log("Dev database cleared and migrations are up to date.");
	console.log("Run `npm run db:seed` in packages/db to repopulate.");
}

await main();
