// Imports colour presets from tweakcn (https://github.com/jnsahaj/tweakcn, Apache-2.0).
// Run with: bun run themes:import
//
// Only colours are taken (converted to OKLCH). Fonts, radius and shadows are
// ignored because members choose those separately. A mode that fails the
// contrast checks is dropped, so presets can never make text unreadable.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	formatOklch,
	type Oklch,
	type PaletteMode,
	paletteContrastProblems,
	parseColor,
	repairPaletteTokens,
	STATUS_TOKENS,
} from "../packages/shared/src";

const SOURCE_PATH = "utils/theme-presets.ts";
const RAW_URL = `https://raw.githubusercontent.com/jnsahaj/tweakcn/main/${SOURCE_PATH}`;

/** The colour tokens we read from a preset; everything else is ignored. */
const TOKENS = [
	"background",
	"foreground",
	"card",
	"card-foreground",
	"popover",
	"popover-foreground",
	"primary",
	"primary-foreground",
	"secondary",
	"secondary-foreground",
	"muted",
	"muted-foreground",
	"accent",
	"accent-foreground",
	"destructive",
	"border",
	"input",
	"ring",
	"chart-1",
	"chart-2",
	"chart-3",
	"chart-4",
	"chart-5",
	"sidebar",
	"sidebar-foreground",
	"sidebar-primary",
	"sidebar-primary-foreground",
	"sidebar-accent",
	"sidebar-accent-foreground",
	"sidebar-border",
	"sidebar-ring",
] as const;

type RawPreset = {
	label: string;
	styles: { light?: Record<string, string>; dark?: Record<string, string> };
};

const source = await (await fetch(RAW_URL)).text();
const commit = (
	(await (
		await fetch(
			`https://api.github.com/repos/jnsahaj/tweakcn/commits?path=${SOURCE_PATH}&per_page=1`,
		)
	).json()) as { sha: string }[]
)[0]?.sha;

const dir = mkdtempSync(join(tmpdir(), "tweakcn-"));
const file = join(dir, "presets.mjs");
writeFileSync(
	file,
	source
		.replace(/^import .*$/gm, "")
		.replace(/: Record<string, ThemePreset>/g, ""),
);
const { defaultPresets } = (await import(file)) as {
	defaultPresets: Record<string, RawPreset>;
};

function quantize(value: Oklch): Oklch {
	return {
		l: Number(value.l.toFixed(3)),
		c: Number(value.c.toFixed(3)),
		h: Number(value.h.toFixed(2)),
		a: Number(value.a.toFixed(3)),
	};
}

function convert(
	styles: Record<string, string> | undefined,
	mode: PaletteMode,
) {
	if (!styles) {
		return { tokens: null, problems: ["no styles"], adjusted: [] as string[] };
	}
	const tokens: Record<string, Oklch> = {};
	for (const name of TOKENS) {
		const raw = styles[name];
		if (raw == null) {
			continue;
		}
		const color = parseColor(raw);
		if (!color) {
			return {
				tokens: null,
				problems: [`${name}: cannot read "${raw}"`],
				adjusted: [] as string[],
			};
		}
		tokens[name] = color;
	}
	const merged = { ...STATUS_TOKENS[mode], ...tokens };
	const { tokens: repairedRaw, adjusted } = repairPaletteTokens(merged);
	// Check the values exactly as they will be written (rounded), not the raw ones.
	const repaired = Object.fromEntries(
		Object.entries(repairedRaw).map(([name, value]) => [name, quantize(value)]),
	) as Record<string, Oklch>;
	const problems = paletteContrastProblems(repaired);
	// Keep only what the preset gave us, with any adjusted values.
	const result: Record<string, Oklch> = {};
	for (const name of Object.keys(tokens)) {
		result[name] = repaired[name] as Oklch;
	}
	return { tokens: result, problems, adjusted };
}

type Kept = {
	id: string;
	name: string;
	light?: Record<string, Oklch>;
	dark?: Record<string, Oklch>;
};
const kept: Kept[] = [];
const skipped: string[] = [];
const adjustedNotes: string[] = [];

for (const [id, preset] of Object.entries(defaultPresets)) {
	const entry: Kept = { id, name: preset.label };
	for (const mode of ["light", "dark"] as const) {
		const { tokens, problems, adjusted } = convert(preset.styles[mode], mode);
		if (tokens && problems.length === 0) {
			entry[mode] = tokens;
			if (adjusted.length > 0) {
				adjustedNotes.push(`${id} (${mode}): ${adjusted.join(", ")}`);
			}
		} else {
			skipped.push(`${id} (${mode}): ${problems[0]}`);
		}
	}
	if (entry.light || entry.dark) {
		kept.push(entry);
	}
}

const num = (value: number, digits: number) =>
	String(Number(value.toFixed(digits)));
const color = (value: Oklch) =>
	value.a < 1
		? `o(${num(value.l, 3)}, ${num(value.c, 3)}, ${num(value.h, 2)}, ${num(value.a, 3)})`
		: `o(${num(value.l, 3)}, ${num(value.c, 3)}, ${num(value.h, 2)})`;
const tokensLiteral = (tokens: Record<string, Oklch>) =>
	`{ tokens: { ${Object.entries(tokens)
		.map(([name, value]) => `${JSON.stringify(name)}: ${color(value)}`)
		.join(", ")} } }`;

kept.sort((a, b) => a.name.localeCompare(b.name));

const body = kept
	.map((palette) => {
		const modes = (["light", "dark"] as const).filter((mode) => palette[mode]);
		return `\t{
\t\tid: ${JSON.stringify(palette.id)},
\t\tname: ${JSON.stringify(palette.name)},
\t\tdescription: "",
\t\tmodes: ${JSON.stringify(modes)},
${modes.map((mode) => `\t\t${mode}: ${tokensLiteral(palette[mode] as Record<string, Oklch>)},`).join("\n")}
\t},`;
	})
	.join("\n");

const skippedNote = skipped.length
	? `\n * Left out because they failed the contrast checks:\n${skipped.map((line) => ` *   ${line}`).join("\n")}`
	: "";

const adjustedNote = adjustedNotes.length
	? `\n * Slightly adjusted for readability (text colours only):\n${adjustedNotes.map((line) => ` *   ${line}`).join("\n")}`
	: "";

const output = `/**
 * Colour presets from tweakcn (https://github.com/jnsahaj/tweakcn), licensed
 * under the Apache License 2.0. Only colours are used, converted to OKLCH.
 * See THIRD_PARTY_NOTICES.md.
 *
 * Generated by scripts/import-tweakcn-presets.ts (bun run themes:import) from
 * ${SOURCE_PATH} at commit ${commit ?? "unknown"}. Do not edit by hand.${adjustedNote}${skippedNote}
 */
import { type Oklch, oklch } from "./oklch";
import type { Palette } from "./palettes";

const o = (l: number, c: number, h: number, a = 1): Oklch => oklch(l, c, h, a);

export const IMPORTED_PALETTES: readonly Palette[] = [
${body}
];
`;

writeFileSync(
	join(import.meta.dir, "../packages/shared/src/themes/imported-palettes.ts"),
	output,
);
console.log(
	`Imported ${kept.length} presets, adjusted ${adjustedNotes.length} modes, skipped ${skipped.length} modes.`,
);
for (const line of skipped) {
	console.log(`  skipped ${line}`);
}
