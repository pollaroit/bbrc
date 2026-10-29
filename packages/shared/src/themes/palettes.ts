import { IMPORTED_PALETTES } from "./imported-palettes";
import { formatOklch, type Oklch, oklch } from "./oklch";

export type PaletteMode = "light" | "dark";

/**
 * The handful of values that make a palette. Everything else (card text,
 * sidebar, charts, map colours, status colours) is derived, so a palette can
 * never leave a token undefined.
 */
export type PaletteTone = {
	background: Oklch;
	foreground: Oklch;
	card: Oklch;
	secondary: Oklch;
	muted: Oklch;
	mutedForeground: Oklch;
	accent: Oklch;
	border: Oklch;
	input: Oklch;
	ring: Oklch;
	primary: Oklch;
	primaryForeground: Oklch;
	/** Hue for the chart and map ramps. */
	chartHue: number;
	/** 0 gives grey charts, 1 the normal colourful ramp. */
	chartChroma?: number;
	/** Per-step hues for the chart ramp; defaults to `chartHue` for every step. */
	chartHues?: number[];
	sidebar?: Oklch;
	sidebarPrimary?: Oklch;
	sidebarPrimaryForeground?: Oklch;
};

/**
 * A palette whose every colour is given outright (imported presets). Status
 * colours are filled in from `STATUS_TOKENS` unless the preset sets its own.
 */
export type PaletteTokens = { tokens: Record<string, Oklch> };

export type PaletteDefinition = PaletteTone | PaletteTokens;

export type Palette = {
	id: string;
	name: string;
	description: string;
	/** Modes this palette supports. A single mode locks light or dark. */
	modes: readonly PaletteMode[];
	light?: PaletteDefinition;
	dark?: PaletteDefinition;
};

const white = oklch(1, 0, 0);

/** Status and accent colours keep their meaning in every palette. */
export const STATUS_TOKENS: Record<PaletteMode, Record<string, Oklch>> = {
	light: {
		success: oklch(0.596, 0.145, 163.225),
		"success-ink": oklch(0.378, 0.077, 168.94),
		warning: oklch(0.769, 0.188, 70.08),
		"warning-ink": oklch(0.414, 0.112, 45.904),
		info: oklch(0.588, 0.158, 241.966),
		"info-ink": oklch(0.293, 0.066, 243.157),
		destructive: oklch(0.577, 0.245, 27.325),
		"destructive-ink": oklch(0.396, 0.141, 25.723),
		violet: oklch(0.541, 0.281, 293.009),
		"violet-ink": oklch(0.283, 0.141, 291.089),
		pink: oklch(0.656, 0.241, 354.308),
		"pink-ink": oklch(0.284, 0.109, 3.907),
		orange: oklch(0.646, 0.222, 41.116),
		"orange-ink": oklch(0.408, 0.123, 38.172),
		teal: oklch(0.6, 0.118, 184.704),
		"teal-ink": oklch(0.386, 0.063, 188.416),
	},
	dark: {
		success: oklch(0.696, 0.17, 162.48),
		"success-ink": oklch(0.905, 0.093, 164.15),
		warning: oklch(0.769, 0.188, 70.08),
		"warning-ink": oklch(0.924, 0.12, 95.746),
		info: oklch(0.746, 0.16, 232.661),
		"info-ink": oklch(0.901, 0.058, 230.902),
		destructive: oklch(0.704, 0.191, 22.216),
		"destructive-ink": oklch(0.885, 0.062, 18.334),
		violet: oklch(0.702, 0.183, 293.541),
		"violet-ink": oklch(0.894, 0.057, 293.283),
		pink: oklch(0.718, 0.202, 349.761),
		"pink-ink": oklch(0.899, 0.061, 343.231),
		orange: oklch(0.705, 0.213, 47.604),
		"orange-ink": oklch(0.901, 0.076, 70.697),
		teal: oklch(0.704, 0.14, 182.503),
		"teal-ink": oklch(0.91, 0.096, 180.426),
	},
};

const DEFAULT_PALETTE: Palette = {
	id: "default",
	name: "Brigada",
	description: "The classic blue.",
	modes: ["light", "dark"],
	light: {
		background: white,
		foreground: oklch(0.145, 0, 0),
		card: white,
		secondary: oklch(0.967, 0.001, 286.375),
		muted: oklch(0.97, 0, 0),
		mutedForeground: oklch(0.54, 0, 0),
		accent: oklch(0.97, 0, 0),
		border: oklch(0.922, 0, 0),
		input: oklch(0.922, 0, 0),
		ring: oklch(0.708, 0, 0),
		primary: oklch(0.5, 0.134, 242.749),
		primaryForeground: oklch(0.977, 0.013, 236.62),
		chartHue: 240,
		chartHues: [230.318, 237.323, 241.966, 242.749, 240.79],
		sidebar: oklch(0.985, 0, 0),
		sidebarPrimary: oklch(0.588, 0.158, 241.966),
	},
	dark: {
		background: oklch(0.145, 0, 0),
		foreground: oklch(0.985, 0, 0),
		card: oklch(0.205, 0, 0),
		secondary: oklch(0.274, 0.006, 286.033),
		muted: oklch(0.269, 0, 0),
		mutedForeground: oklch(0.708, 0, 0),
		accent: oklch(0.269, 0, 0),
		border: oklch(1, 0, 0, 0.1),
		input: oklch(1, 0, 0, 0.15),
		ring: oklch(0.556, 0, 0),
		primary: oklch(0.443, 0.11, 240.79),
		primaryForeground: oklch(0.977, 0.013, 236.62),
		chartHue: 240,
		chartHues: [230.318, 237.323, 241.966, 242.749, 240.79],
		sidebarPrimary: oklch(0.685, 0.169, 237.323),
		sidebarPrimaryForeground: oklch(0.293, 0.066, 243.157),
	},
};

/** Brigada first, then presets imported from tweakcn (see imported-palettes.ts). */
export const PALETTES: readonly Palette[] = [
	DEFAULT_PALETTE,
	...IMPORTED_PALETTES,
];

export const DEFAULT_PALETTE_ID = "default";

export const PALETTE_IDS = PALETTES.map((palette) => palette.id);

export function getPalette(id: string): Palette {
	return (
		PALETTES.find((palette) => palette.id === id) ?? (PALETTES[0] as Palette)
	);
}

/** The single mode a palette is locked to, or null when it supports both. */
export function lockedModeFor(id: string): PaletteMode | null {
	const palette = getPalette(id);
	return palette.modes.length === 1 ? (palette.modes[0] as PaletteMode) : null;
}

const CHART_RAMP: readonly [number, number][] = [
	[0.828, 0.111],
	[0.685, 0.169],
	[0.588, 0.158],
	[0.5, 0.134],
	[0.443, 0.11],
];

function mapTokens(hue: number, chroma: number): Record<string, Oklch> {
	return {
		"map-region": oklch(0.443, 0.11 * chroma, hue),
		"map-region-hover": oklch(0.5, 0.134 * chroma, hue),
		"map-region-selected": oklch(0.391, 0.09 * chroma, hue),
		"map-region-disabled": oklch(0.554, 0.046, 257.417),
		"map-region-stroke": oklch(0.282, 0.091, 267.935),
		"map-region-stroke-hover": oklch(0.282, 0.091, 267.935),
		"map-region-focus-ring": oklch(0.707, 0.165, 254.624),
		"map-label": oklch(1, 0, 0),
		"map-label-hover": oklch(1, 0, 0),
		"map-label-selected": oklch(1, 0, 0),
	};
}

export function isExplicitPalette(
	definition: PaletteDefinition,
): definition is PaletteTokens {
	return "tokens" in definition;
}

/** Every CSS custom property (without the leading `--`) a palette sets in one mode. */
export function paletteTokens(
	definition: PaletteDefinition,
	mode: PaletteMode,
): Record<string, Oklch> {
	if (isExplicitPalette(definition)) {
		const given = definition.tokens;
		const hue = given["chart-1"]?.h ?? given.primary?.h ?? 240;
		return {
			...mapTokens(hue, given["chart-1"]?.c === 0 ? 0 : 1),
			...STATUS_TOKENS[mode],
			...given,
		};
	}

	const tone = definition;
	const tokens: Record<string, Oklch> = {
		background: tone.background,
		foreground: tone.foreground,
		card: tone.card,
		"card-foreground": tone.foreground,
		popover: tone.card,
		"popover-foreground": tone.foreground,
		primary: tone.primary,
		"primary-foreground": tone.primaryForeground,
		secondary: tone.secondary,
		"secondary-foreground": tone.foreground,
		muted: tone.muted,
		"muted-foreground": tone.mutedForeground,
		accent: tone.accent,
		"accent-foreground": tone.foreground,
		border: tone.border,
		input: tone.input,
		ring: tone.ring,
		sidebar: tone.sidebar ?? tone.card,
		"sidebar-foreground": tone.foreground,
		"sidebar-primary": tone.sidebarPrimary ?? tone.primary,
		"sidebar-primary-foreground":
			tone.sidebarPrimaryForeground ?? tone.primaryForeground,
		"sidebar-accent": tone.accent,
		"sidebar-accent-foreground": tone.foreground,
		"sidebar-border": tone.border,
		"sidebar-ring": tone.ring,
		...STATUS_TOKENS[mode],
	};

	const chroma = tone.chartChroma ?? 1;
	CHART_RAMP.forEach(([l, c], index) => {
		const hue = tone.chartHues?.[index] ?? tone.chartHue;
		tokens[`chart-${index + 1}`] = oklch(l, c * chroma, hue);
	});

	const lastHue = tone.chartHues?.[4] ?? tone.chartHue;
	return { ...tokens, ...mapTokens(lastHue, chroma) };
}

function declarations(tokens: Record<string, Oklch>): string {
	return Object.entries(tokens)
		.map(([name, color]) => `\t--${name}: ${formatOklch(color)};`)
		.join("\n");
}

/**
 * The palette stylesheet. Palettes are plain attribute selectors, so they work
 * on `<html>` and on any wrapper (the theme preview page uses wrappers).
 */
export function buildPalettesCss(): string {
	const blocks: string[] = [
		"/* Generated by scripts/generate-palettes.ts from packages/shared/src/themes/palettes.ts. Do not edit. */",
	];

	for (const palette of PALETTES) {
		const isDefault = palette.id === DEFAULT_PALETTE_ID;
		const light = palette.light;
		const dark = palette.dark;

		if (light) {
			const selector = isDefault
				? `:root,\n[data-palette="${palette.id}"]`
				: `[data-palette="${palette.id}"]`;
			blocks.push(
				`/* ${palette.name}, light */\n${selector} {\n${declarations(paletteTokens(light, "light"))}\n}`,
			);
		}
		if (dark) {
			const selector = isDefault
				? `.dark,\n[data-palette="${palette.id}"].dark`
				: `[data-palette="${palette.id}"].dark`;
			blocks.push(
				`/* ${palette.name}, dark */\n${selector} {\n${declarations(paletteTokens(dark, "dark"))}\n}`,
			);
		}
	}

	return `${blocks.join("\n\n")}\n`;
}

/** Browser chrome colour (PWA status bar) for a palette in a mode. */
export function paletteBackgroundTone(id: string, mode: PaletteMode): Oklch {
	const palette = getPalette(id);
	const definition =
		(mode === "dark" ? palette.dark : palette.light) ??
		palette.dark ??
		palette.light;
	const actualMode: PaletteMode = (
		mode === "dark"
			? palette.dark
			: palette.light
	)
		? mode
		: palette.dark
			? "dark"
			: "light";
	return paletteTokens(definition as PaletteDefinition, actualMode)
		.background as Oklch;
}
