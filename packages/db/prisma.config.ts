import path from "node:path";

import { defineConfig } from "prisma/config";
import "varlock/auto-load";

import { resolveMigrateDatabaseUrl } from "./src/migrate-database-url";

export default defineConfig({
	schema: path.join("prisma", "schema"),
	migrations: {
		path: path.join("prisma", "migrations"),
		seed: "bun run src/seed/index.ts",
	},
	datasource: {
		url: resolveMigrateDatabaseUrl(),
	},
});
