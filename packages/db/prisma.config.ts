import path from "node:path";

import { defineConfig, env } from "prisma/config";
import "varlock/auto-load";

export default defineConfig({
	schema: path.join("prisma", "schema"),
	migrations: {
		path: path.join("prisma", "migrations"),
		seed: "bun run src/seed/index.ts",
	},
	datasource: {
		url: env("DATABASE_URL"),
	},
});
