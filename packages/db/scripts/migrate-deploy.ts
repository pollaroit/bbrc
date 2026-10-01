import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "varlock/auto-load";

import { resolveMigrateDatabaseUrl } from "../src/migrate-database-url";

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

async function main() {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const exitCode = runMigrateDeploy();
		if (exitCode === 0) {
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
