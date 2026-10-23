import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAppearanceCss } from "../preferences";
import {
	compositeOver,
	contrastOn,
	contrastRgb,
	type Oklch,
	oklch,
	oklchToSrgb,
} from "./oklch";
import {
	buildPalettesCss,
	PALETTES,
	type PaletteMode,
	paletteTokens,
	STATUS_TOKENS,
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
const KNOWN_EXCEPTIONS = new Set(["default (dark): primary on background"]);

const cases = PALETTES.flatMap((palette) =>
	palette.modes.map((mode) => ({ palette, mode: mode as PaletteMode })),
);

function toneOf(palette: (typeof PALETTES)[number], mode: PaletteMode) {
	const tone = mode === "dark" ? palette.dark : palette.light;
	if (!tone) {
		throw new Error(`${palette.id} has no ${mode} tone`);
	}
	return tone;
}

describe("palettes", () => {
	test("every palette defines the modes it claims", () => {
		for (const palette of PALETTES) {
			for (const mode of palette.modes) {
				expect(toneOf(palette, mode)).toBeDefined();
			}
		}
	});

	test("palette ids are unique", () => {
		const ids = PALETTES.map((palette) => palette.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	for (const { palette, mode } of cases) {
		const label = `${palette.id} (${mode})`;
		const tokens = paletteTokens(toneOf(palette, mode), mode);

		test(`${label} defines every token`, () => {
			for (const name of REQUIRED_TOKENS) {
				expect(tokens[name]).toBeDefined();
			}
		});

		test(`${label} keeps text readable`, () => {
			const t = (name: string) => tokens[name] as Oklch;
			const pairs: [string, Oklch, Oklch, number][] = [
				["foreground on background", t("foreground"), t("background"), 7],
				["card-foreground on card", t("card-foreground"), t("card"), 7],
				["foreground on muted", t("foreground"), t("muted"), 4.5],
				["foreground on accent", t("foreground"), t("accent"), 4.5],
				["foreground on secondary", t("foreground"), t("secondary"), 4.5],
				[
					"muted-foreground on background",
					t("muted-foreground"),
					t("background"),
					4.5,
				],
				["muted-foreground on card", t("muted-foreground"), t("card"), 4.5],
				["muted-foreground on muted", t("muted-foreground"), t("muted"), 4.5],
				[
					"primary-foreground on primary",
					t("primary-foreground"),
					t("primary"),
					4.5,
				],
				["primary on background", t("primary"), t("background"), 3],
			];
			for (const [name, fg, bg, min] of pairs) {
				if (KNOWN_EXCEPTIONS.has(`${label}: ${name}`)) {
					continue;
				}
				const ratio = contrastOn(fg, bg);
				expect(`${name}: ${ratio >= min ? "ok" : ratio.toFixed(2)}`).toBe(
					`${name}: ok`,
				);
			}
		});

		test(`${label} keeps status colours readable`, () => {
			const background = tokens.background as Oklch;
			const card = tokens.card as Oklch;
			for (const name of [
				"success",
				"warning",
				"info",
				"destructive",
				"violet",
				"pink",
			]) {
				const mid = tokens[name] as Oklch;
				const ink = tokens[`${name}-ink`] as Oklch;
				for (const backdrop of [background, card]) {
					// Ink text on a `bg-{name}/15` surface, blended the way browsers do.
					const surface = compositeOver(
						oklch(mid.l, mid.c, mid.h, 0.15),
						backdrop,
					);
					const ratio = contrastRgb(oklchToSrgb(ink), surface);
					expect(`${name} ink: ${ratio >= 4.5 ? "ok" : ratio.toFixed(2)}`).toBe(
						`${name} ink: ok`,
					);
				}
				// Icons and borders drawn in the mid colour need 3:1, amber is a known exception.
				const iconMin = name === "warning" ? 1.8 : 3;
				const ratio = contrastOn(mid, background);
				expect(
					`${name} icon: ${ratio >= iconMin ? "ok" : ratio.toFixed(2)}`,
				).toBe(`${name} icon: ok`);
			}
		});
	}

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
