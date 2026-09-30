/**
 * prisma-zod-generator emits Prisma helper enums (ScalarFieldEnum, SortOrder, …)
 * even in models-only mode. Keep only enum files imported by pure model schemas.
 */
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const generatedRoot = path.join(
	import.meta.dirname,
	"../src/generated/schemas",
);
const modelsDir = path.join(generatedRoot, "models");
const enumsDir = path.join(generatedRoot, "enums");

const enumImport = /from\s+["']\.\.\/enums\/([A-Za-z0-9_]+)\.schema["']/g;

const referenced = new Set<string>();

for (const file of await readdir(modelsDir)) {
	if (!file.endsWith(".schema.ts")) {
		continue;
	}
	const content = await readFile(path.join(modelsDir, file), "utf8");
	for (const match of content.matchAll(enumImport)) {
		// biome-ignore lint/style/noNonNullAssertion: match is guaranteed to be non-null
		referenced.add(match[1]!);
	}
}

let removed = 0;
for (const file of await readdir(enumsDir)) {
	if (!file.endsWith(".schema.ts")) {
		continue;
	}
	const enumName = file.replace(/\.schema\.ts$/, "");
	if (!referenced.has(enumName)) {
		await unlink(path.join(enumsDir, file));
		removed++;
	}
}

const indexLines = [
	"/**",
	" * Schema enums referenced by generated model schemas",
	" * Auto-maintained by `bun run prune-enums` after `db:generate`",
	" */",
	"",
	...[...referenced]
		.sort()
		.map((name) => `export { ${name}Schema } from "./${name}.schema";`),
	"",
];

await writeFile(path.join(enumsDir, "index.ts"), indexLines.join("\n"));

console.log(
	`@bbrc/schemas: kept ${referenced.size} enum(s), removed ${removed} unreferenced helper enum(s)`,
);
