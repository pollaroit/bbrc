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

export type Palette = {
	id: string;
	name: string;
	description: string;
	/** Modes this palette supports. A single mode locks light or dark. */
	modes: readonly PaletteMode[];
	light?: PaletteTone;
	dark?: PaletteTone;
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
	},
};

export const PALETTES: readonly Palette[] = [
	{
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
	},
	{
		id: "paper",
		name: "Paper",
		description: "Warm cream pages by day, a sepia lamp by night.",
		modes: ["light", "dark"],
		light: {
			background: oklch(0.975, 0.012, 85),
			foreground: oklch(0.24, 0.02, 60),
			card: oklch(0.99, 0.008, 85),
			secondary: oklch(0.95, 0.015, 82),
			muted: oklch(0.94, 0.015, 82),
			mutedForeground: oklch(0.46, 0.03, 65),
			accent: oklch(0.93, 0.02, 80),
			border: oklch(0.88, 0.02, 80),
			input: oklch(0.88, 0.02, 80),
			ring: oklch(0.6, 0.05, 65),
			primary: oklch(0.46, 0.09, 55),
			primaryForeground: oklch(0.98, 0.01, 85),
			chartHue: 55,
		},
		dark: {
			background: oklch(0.2, 0.015, 60),
			foreground: oklch(0.92, 0.02, 85),
			card: oklch(0.25, 0.018, 60),
			secondary: oklch(0.28, 0.02, 60),
			muted: oklch(0.3, 0.02, 60),
			mutedForeground: oklch(0.72, 0.03, 75),
			accent: oklch(0.3, 0.02, 60),
			border: oklch(0.92, 0.02, 85, 0.14),
			input: oklch(0.92, 0.02, 85, 0.18),
			ring: oklch(0.6, 0.05, 70),
			primary: oklch(0.78, 0.1, 70),
			primaryForeground: oklch(0.22, 0.02, 60),
			chartHue: 70,
		},
	},
	{
		id: "midnight",
		name: "Midnight",
		description: "Deep navy, with an icy light twin.",
		modes: ["light", "dark"],
		light: {
			background: oklch(0.985, 0.006, 250),
			foreground: oklch(0.2, 0.04, 265),
			card: white,
			secondary: oklch(0.95, 0.015, 255),
			muted: oklch(0.955, 0.012, 255),
			mutedForeground: oklch(0.46, 0.04, 262),
			accent: oklch(0.95, 0.02, 260),
			border: oklch(0.9, 0.015, 255),
			input: oklch(0.9, 0.015, 255),
			ring: oklch(0.65, 0.1, 265),
			primary: oklch(0.45, 0.17, 265),
			primaryForeground: oklch(0.985, 0.01, 250),
			chartHue: 265,
		},
		dark: {
			background: oklch(0.17, 0.03, 265),
			foreground: oklch(0.95, 0.01, 250),
			card: oklch(0.22, 0.035, 265),
			secondary: oklch(0.26, 0.03, 265),
			muted: oklch(0.27, 0.035, 265),
			mutedForeground: oklch(0.74, 0.03, 255),
			accent: oklch(0.28, 0.04, 265),
			border: oklch(0.95, 0.01, 250, 0.12),
			input: oklch(0.95, 0.01, 250, 0.16),
			ring: oklch(0.6, 0.1, 265),
			primary: oklch(0.72, 0.13, 265),
			primaryForeground: oklch(0.18, 0.03, 265),
			chartHue: 265,
		},
	},
	{
		id: "forest",
		name: "Forest",
		description: "Mossy greens that are easy on the eyes.",
		modes: ["light", "dark"],
		light: {
			background: oklch(0.98, 0.008, 150),
			foreground: oklch(0.22, 0.03, 155),
			card: oklch(0.995, 0.004, 150),
			secondary: oklch(0.94, 0.015, 150),
			muted: oklch(0.95, 0.014, 150),
			mutedForeground: oklch(0.45, 0.04, 155),
			accent: oklch(0.93, 0.025, 150),
			border: oklch(0.89, 0.02, 150),
			input: oklch(0.89, 0.02, 150),
			ring: oklch(0.6, 0.08, 155),
			primary: oklch(0.42, 0.1, 155),
			primaryForeground: oklch(0.98, 0.01, 150),
			chartHue: 155,
		},
		dark: {
			background: oklch(0.18, 0.025, 160),
			foreground: oklch(0.94, 0.015, 150),
			card: oklch(0.23, 0.03, 160),
			secondary: oklch(0.27, 0.03, 160),
			muted: oklch(0.28, 0.03, 160),
			mutedForeground: oklch(0.74, 0.04, 155),
			accent: oklch(0.29, 0.035, 160),
			border: oklch(0.94, 0.015, 150, 0.12),
			input: oklch(0.94, 0.015, 150, 0.16),
			ring: oklch(0.6, 0.08, 155),
			primary: oklch(0.75, 0.14, 155),
			primaryForeground: oklch(0.18, 0.03, 160),
			chartHue: 155,
		},
	},
	{
		id: "rose",
		name: "Rosé",
		description: "Soft pinks and a plum evening.",
		modes: ["light", "dark"],
		light: {
			background: oklch(0.985, 0.006, 15),
			foreground: oklch(0.22, 0.03, 10),
			card: white,
			secondary: oklch(0.955, 0.014, 15),
			muted: oklch(0.96, 0.012, 15),
			mutedForeground: oklch(0.47, 0.04, 10),
			accent: oklch(0.945, 0.025, 10),
			border: oklch(0.91, 0.018, 12),
			input: oklch(0.91, 0.018, 12),
			ring: oklch(0.62, 0.12, 10),
			primary: oklch(0.5, 0.18, 10),
			primaryForeground: oklch(0.985, 0.01, 15),
			chartHue: 10,
		},
		dark: {
			background: oklch(0.19, 0.025, 10),
			foreground: oklch(0.95, 0.012, 15),
			card: oklch(0.24, 0.03, 10),
			secondary: oklch(0.28, 0.03, 10),
			muted: oklch(0.29, 0.03, 10),
			mutedForeground: oklch(0.75, 0.04, 12),
			accent: oklch(0.3, 0.04, 10),
			border: oklch(0.95, 0.012, 15, 0.12),
			input: oklch(0.95, 0.012, 15, 0.16),
			ring: oklch(0.62, 0.12, 10),
			primary: oklch(0.74, 0.15, 10),
			primaryForeground: oklch(0.19, 0.03, 10),
			chartHue: 10,
		},
	},
	{
		id: "nord",
		name: "Nord",
		description: "Cool, calm Arctic blues.",
		modes: ["light", "dark"],
		light: {
			background: oklch(0.96, 0.008, 240),
			foreground: oklch(0.32, 0.035, 255),
			card: oklch(0.985, 0.005, 240),
			secondary: oklch(0.92, 0.012, 240),
			muted: oklch(0.93, 0.012, 240),
			mutedForeground: oklch(0.46, 0.035, 250),
			accent: oklch(0.91, 0.02, 235),
			border: oklch(0.88, 0.015, 240),
			input: oklch(0.88, 0.015, 240),
			ring: oklch(0.6, 0.08, 230),
			primary: oklch(0.5, 0.08, 230),
			primaryForeground: oklch(0.98, 0.005, 240),
			chartHue: 230,
		},
		dark: {
			background: oklch(0.3, 0.03, 255),
			foreground: oklch(0.93, 0.01, 240),
			card: oklch(0.34, 0.03, 255),
			secondary: oklch(0.37, 0.03, 255),
			muted: oklch(0.38, 0.03, 255),
			mutedForeground: oklch(0.8, 0.025, 245),
			accent: oklch(0.4, 0.035, 255),
			border: oklch(0.93, 0.01, 240, 0.14),
			input: oklch(0.93, 0.01, 240, 0.18),
			ring: oklch(0.65, 0.07, 230),
			primary: oklch(0.78, 0.09, 215),
			primaryForeground: oklch(0.3, 0.03, 255),
			chartHue: 215,
		},
	},
	{
		id: "terminal",
		name: "Terminal",
		description: "Phosphor green on black. Dark only.",
		modes: ["dark"],
		dark: {
			background: oklch(0.13, 0.015, 150),
			foreground: oklch(0.85, 0.15, 150),
			card: oklch(0.17, 0.02, 150),
			secondary: oklch(0.22, 0.03, 150),
			muted: oklch(0.21, 0.025, 150),
			mutedForeground: oklch(0.7, 0.13, 150),
			accent: oklch(0.24, 0.04, 150),
			border: oklch(0.85, 0.15, 150, 0.22),
			input: oklch(0.85, 0.15, 150, 0.28),
			ring: oklch(0.7, 0.15, 150),
			primary: oklch(0.8, 0.19, 150),
			primaryForeground: oklch(0.13, 0.015, 150),
			chartHue: 150,
		},
	},
	{
		id: "ink",
		name: "Ink",
		description: "Pure black and white, like a printed page.",
		modes: ["light", "dark"],
		light: {
			background: white,
			foreground: oklch(0.1, 0, 0),
			card: white,
			secondary: oklch(0.95, 0, 0),
			muted: oklch(0.965, 0, 0),
			mutedForeground: oklch(0.42, 0, 0),
			accent: oklch(0.94, 0, 0),
			border: oklch(0.8, 0, 0),
			input: oklch(0.8, 0, 0),
			ring: oklch(0.3, 0, 0),
			primary: oklch(0.15, 0, 0),
			primaryForeground: oklch(0.99, 0, 0),
			chartHue: 0,
			chartChroma: 0,
		},
		dark: {
			background: oklch(0.1, 0, 0),
			foreground: oklch(0.97, 0, 0),
			card: oklch(0.15, 0, 0),
			secondary: oklch(0.2, 0, 0),
			muted: oklch(0.2, 0, 0),
			mutedForeground: oklch(0.72, 0, 0),
			accent: oklch(0.22, 0, 0),
			border: oklch(1, 0, 0, 0.25),
			input: oklch(1, 0, 0, 0.3),
			ring: oklch(0.85, 0, 0),
			primary: oklch(0.97, 0, 0),
			primaryForeground: oklch(0.12, 0, 0),
			chartHue: 0,
			chartChroma: 0,
		},
	},
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

/** Every CSS custom property (without the leading `--`) a palette sets in one mode. */
export function paletteTokens(
	tone: PaletteTone,
	mode: PaletteMode,
): Record<string, Oklch> {
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
	tokens["map-region"] = oklch(0.443, 0.11 * chroma, lastHue);
	tokens["map-region-hover"] = oklch(
		0.5,
		0.134 * chroma,
		tone.chartHues?.[3] ?? tone.chartHue,
	);
	tokens["map-region-selected"] = oklch(0.391, 0.09 * chroma, lastHue);
	tokens["map-region-disabled"] = oklch(0.554, 0.046, 257.417);
	tokens["map-region-stroke"] = oklch(0.282, 0.091, 267.935);
	tokens["map-region-stroke-hover"] = oklch(0.282, 0.091, 267.935);
	tokens["map-region-focus-ring"] = oklch(0.707, 0.165, 254.624);
	tokens["map-label"] = oklch(1, 0, 0);
	tokens["map-label-hover"] = oklch(1, 0, 0);
	tokens["map-label-selected"] = oklch(1, 0, 0);

	return tokens;
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
	const tone =
		(mode === "dark" ? palette.dark : palette.light) ??
		palette.dark ??
		palette.light;
	return (tone as PaletteTone).background;
}
