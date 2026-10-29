import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAppearanceCss } from "../preferences";
import { paletteContrastProblems } from "./contrast";
import {
	buildPalettesCss,
	PALETTES,
	type PaletteDefinition,
	type PaletteMode,
	paletteTokens,
	STATUS_TOKENS,
	TIER_HUES,
	TIER_TOKENS,
} from "./palettes";

const styles = join(import.meta.dir, "../../../ui/src/styles");

const REQUIRED_TOKENS = [
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
	"border",
	"input",
	"ring",
	"destructive",
	"success",
	"warning",
	"info",
	"violet",
	"pink",
	"success-ink",
	"warning-ink",
	"info-ink",
	"destructive-ink",
	"violet-ink",
	"pink-ink",
	...Object.keys(TIER_HUES).flatMap((name) => [
		`tier-${name}`,
		`tier-${name}-ink`,
	]),
	"chart-1",
	"chart-5",
	"sidebar",
	"sidebar-primary",
	"map-region",
];

/**
 * Existing looks we have chosen not to change. The default dark palette's
 * button blue is dark, so using it as text (`text-primary` links) is below 3:1.
 */
const KNOWN_EXCEPTIONS = new Set([
	"default (dark): primary on background: 2.63 (needs 3)",
]);

const cases = PALETTES.flatMap((palette) =>
	palette.modes.map((mode) => ({ palette, mode: mode as PaletteMode })),
);

function definitionOf(
	palette: (typeof PALETTES)[number],
	mode: PaletteMode,
): PaletteDefinition {
	const definition = mode === "dark" ? palette.dark : palette.light;
	if (!definition) {
		throw new Error(`${palette.id} has no ${mode} definition`);
	}
	return definition;
}

describe("palettes", () => {
	test("there are presets beyond the default", () => {
		expect(PALETTES.length).toBeGreaterThan(10);
	});

	test("every palette defines the modes it claims", () => {
		for (const palette of PALETTES) {
			expect(palette.modes.length).toBeGreaterThan(0);
			for (const mode of palette.modes) {
				expect(definitionOf(palette, mode)).toBeDefined();
			}
		}
	});

	test("palette ids are unique", () => {
		const ids = PALETTES.map((palette) => palette.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	for (const { palette, mode } of cases) {
		const label = `${palette.id} (${mode})`;
		const tokens = paletteTokens(definitionOf(palette, mode), mode);

		test(`${label} defines every token`, () => {
			for (const name of REQUIRED_TOKENS) {
				expect(tokens[name]).toBeDefined();
			}
		});

		test(`${label} is readable`, () => {
			const problems = paletteContrastProblems(tokens).filter(
				(problem) => !KNOWN_EXCEPTIONS.has(`${label}: ${problem}`),
			);
			expect(problems).toEqual([]);
		});
	}

	test("the eight tier colours stay clearly different from each other", () => {
		const hues = Object.values(TIER_HUES).sort((a, b) => a - b);
		for (let index = 0; index < hues.length; index++) {
			const next = hues[(index + 1) % hues.length] as number;
			const gap = (next - (hues[index] as number) + 360) % 360;
			expect(gap).toBeGreaterThanOrEqual(30);
		}
		for (const mode of ["light", "dark"] as const) {
			const names = Object.keys(TIER_HUES);
			for (const a of names) {
				for (const b of names) {
					if (a >= b) continue;
					const x = TIER_TOKENS[mode][`tier-${a}`];
					const y = TIER_TOKENS[mode][`tier-${b}`];
					if (!x || !y) throw new Error("missing tier token");
					const rad = (deg: number) => (deg * Math.PI) / 180;
					const distance = Math.hypot(
						x.c * Math.cos(rad(x.h)) - y.c * Math.cos(rad(y.h)),
						x.c * Math.sin(rad(x.h)) - y.c * Math.sin(rad(y.h)),
					);
					expect(distance).toBeGreaterThan(0.08);
				}
			}
		}
	});

	test("status tokens are defined for both modes", () => {
		expect(Object.keys(STATUS_TOKENS.light).sort()).toEqual(
			Object.keys(STATUS_TOKENS.dark).sort(),
		);
	});

	test("generated stylesheets are up to date (run `bun run themes:generate`)", () => {
		expect(readFileSync(join(styles, "palettes.css"), "utf8")).toBe(
			buildPalettesCss(),
		);
		expect(readFileSync(join(styles, "appearance.css"), "utf8")).toBe(
			buildAppearanceCss(),
		);
	});
});
