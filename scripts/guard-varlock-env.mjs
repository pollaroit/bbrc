#!/usr/bin/env node
/**
 * Fail fast before `varlock codegen` (postinstall) if apps/web/.env contains keys
 * not declared in .env.schema — undeclared keys are dropped from generated types
 * and have been observed to corrupt local .env during schema sync.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const WEB_DIR = join(ROOT, "apps/web");
const ENV_PATH = join(WEB_DIR, ".env");
const SCHEMA_PATH = join(WEB_DIR, ".env.schema");

function parseEnvKeys(content) {
	const keys = new Set();
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}
		const match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(trimmed);
		if (match) {
			keys.add(match[1]);
		}
	}
	return keys;
}

function parseSchemaKeys(content) {
	const keys = new Set();
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}
		const match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(trimmed);
		if (match) {
			keys.add(match[1]);
		}
	}
	return keys;
}

if (!existsSync(ENV_PATH)) {
	process.exit(0);
}

const envKeys = parseEnvKeys(readFileSync(ENV_PATH, "utf8"));
const schemaKeys = parseSchemaKeys(readFileSync(SCHEMA_PATH, "utf8"));
const undeclared = [...envKeys].filter((key) => !schemaKeys.has(key)).sort();

if (undeclared.length === 0) {
	process.exit(0);
}

console.error(
	"\n❌ apps/web/.env contains keys not declared in apps/web/.env.schema:\n",
);
for (const key of undeclared) {
	console.error(`   • ${key}`);
}
console.error(
	"\nAdd each key to .env.schema before running bun install / env:generate.",
);
console.error("See AGENTS.md → Environment (varlock).\n");
process.exit(1);
