import { DEFAULT_PALETTE_ID, PALETTE_IDS } from "./themes/palettes";

export const COLOR_MODES = ["system", "light", "dark"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export type FontOption = {
	id: string;
	label: string;
	/** Short note shown under the name in the picker. */
	note: string;
	/** CSS custom property next/font sets, when the font is not a system one. */
	cssVar?: string;
	/** Extra next/font variables (for glyph subsets loaded on demand) tried after `cssVar`. */
	extraCssVars?: readonly string[];
	/** Generic fallback stack appended after the web font. */
	fallback: string;
	/** False when the font has no Cyrillic glyphs, so Russian text uses a fallback font. */
	cyrillic: boolean;
};

const SANS = "ui-sans-serif, system-ui, sans-serif";
const SERIF = "ui-serif, Georgia, serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export const FONT_OPTIONS = {
	"geist-mono": {
		id: "geist-mono",
		label: "Geist Mono",
		note: "The club's own look",
		cssVar: "--font-geist-mono",
		extraCssVars: ["--font-geist-mono-ext"],
		fallback: MONO,
		cyrillic: true,
	},
	geist: {
		id: "geist",
		label: "Geist",
		note: "Clean sans-serif",
		cssVar: "--font-geist-sans",
		fallback: SANS,
		cyrillic: true,
	},
	inter: {
		id: "inter",
		label: "Inter",
		note: "Neutral and familiar",
		cssVar: "--font-inter",
		fallback: SANS,
		cyrillic: true,
	},
	"plex-sans": {
		id: "plex-sans",
		label: "IBM Plex Sans",
		note: "Technical, friendly",
		cssVar: "--font-plex-sans",
		fallback: SANS,
		cyrillic: true,
	},
	atkinson: {
		id: "atkinson",
		label: "Atkinson Hyperlegible",
		note: "Made for easy reading",
		cssVar: "--font-atkinson",
		fallback: SANS,
		cyrillic: false,
	},
	literata: {
		id: "literata",
		label: "Literata",
		note: "A serif made for books",
		cssVar: "--font-literata",
		fallback: SERIF,
		cyrillic: true,
	},
	"source-serif": {
		id: "source-serif",
		label: "Source Serif",
		note: "Classic, sturdy serif",
		cssVar: "--font-source-serif",
		fallback: SERIF,
		cyrillic: true,
	},
	"space-grotesk": {
		id: "space-grotesk",
		label: "Space Grotesk",
		note: "Geometric with character",
		cssVar: "--font-space-grotesk",
		fallback: SANS,
		cyrillic: false,
	},
	bricolage: {
		id: "bricolage",
		label: "Bricolage Grotesque",
		note: "Chunky and playful",
		cssVar: "--font-bricolage",
		fallback: SANS,
		cyrillic: false,
	},
	fraunces: {
		id: "fraunces",
		label: "Fraunces",
		note: "Soft, old-style serif",
		cssVar: "--font-fraunces",
		fallback: SERIF,
		cyrillic: false,
	},
	playfair: {
		id: "playfair",
		label: "Playfair Display",
		note: "Elegant, high contrast",
		cssVar: "--font-playfair",
		fallback: SERIF,
		cyrillic: true,
	},
	"system-sans": {
		id: "system-sans",
		label: "System sans",
		note: "Your device's own font",
		fallback: SANS,
		cyrillic: true,
	},
	"system-serif": {
		id: "system-serif",
		label: "System serif",
		note: "Your device's own serif",
		fallback: SERIF,
		cyrillic: true,
	},
} as const satisfies Record<string, FontOption>;

export type FontId = keyof typeof FONT_OPTIONS;

/** Placeholder meaning "use whatever the body font is". */
export const SAME_AS_BODY = "body";

export const BODY_FONT_IDS = [
	"geist-mono",
	"geist",
	"inter",
	"plex-sans",
	"atkinson",
	"literata",
	"source-serif",
	"system-sans",
	"system-serif",
] as const satisfies readonly FontId[];

export const HEADING_FONT_IDS = [
	SAME_AS_BODY,
	"geist-mono",
	"space-grotesk",
	"bricolage",
	"fraunces",
	"playfair",
	"literata",
	"geist",
	"inter",
] as const;

export const READING_FONT_IDS = [
	SAME_AS_BODY,
	"literata",
	"source-serif",
	"atkinson",
	"inter",
	"plex-sans",
	"system-serif",
] as const;

export type BodyFontId = (typeof BODY_FONT_IDS)[number];
export type HeadingFontId = (typeof HEADING_FONT_IDS)[number];
export type ReadingFontId = (typeof READING_FONT_IDS)[number];

export const TEXT_SIZES = [
	{ id: "sm", label: "Small", scale: 0.92 },
	{ id: "md", label: "Default", scale: 1 },
	{ id: "lg", label: "Large", scale: 1.1 },
	{ id: "xl", label: "Extra large", scale: 1.22 },
] as const;
export type TextSizeId = (typeof TEXT_SIZES)[number]["id"];

export const LINE_SPACINGS = [
	{ id: "compact", label: "Compact", scale: 0.94 },
	{ id: "normal", label: "Default", scale: 1 },
	{ id: "relaxed", label: "Relaxed", scale: 1.12 },
] as const;
export type LineSpacingId = (typeof LINE_SPACINGS)[number]["id"];

export const RADIUS_OPTIONS = [
	{ id: "none", label: "None", value: "0" },
	{ id: "xs", label: "XS", value: "0.125rem" },
	{ id: "sm", label: "SM", value: "0.25rem" },
	{ id: "md", label: "MD", value: "0.5rem" },
	{ id: "lg", label: "LG", value: "0.75rem" },
	{ id: "xl", label: "XL", value: "1rem" },
] as const;
export type RadiusId = (typeof RADIUS_OPTIONS)[number]["id"];

export const MOTION_MODES = ["system", "reduce", "full"] as const;
export type MotionMode = (typeof MOTION_MODES)[number];

export const CONTRAST_MODES = ["normal", "high"] as const;
export type ContrastMode = (typeof CONTRAST_MODES)[number];

export const SPOILER_MODES = ["hide", "show"] as const;
export type SpoilerMode = (typeof SPOILER_MODES)[number];

export const TIME_ZONE_MODES = ["club", "device"] as const;
export type TimeZoneMode = (typeof TIME_ZONE_MODES)[number];

export const CLOCK_MODES = ["auto", "12h", "24h"] as const;
export type ClockMode = (typeof CLOCK_MODES)[number];

export type UserPreferences = {
	appearance: {
		/** The member's own light/dark choice; a dark-only palette overrides it while active. */
		mode: ColorMode;
		palette: string;
		fontBody: BodyFontId;
		fontHeading: HeadingFontId;
		fontReading: ReadingFontId;
		textSize: TextSizeId;
		lineSpacing: LineSpacingId;
		/** Corner rounding. "none" is the club's own sharp look. */
		radius: RadiusId;
	};
	accessibility: {
		motion: MotionMode;
		contrast: ContrastMode;
	};
	reading: {
		spoilers: SpoilerMode;
	};
	time: {
		zone: TimeZoneMode;
		clock: ClockMode;
	};
};

export const DEFAULT_PREFERENCES: UserPreferences = {
	appearance: {
		mode: "system",
		palette: DEFAULT_PALETTE_ID,
		fontBody: "geist-mono",
		fontHeading: SAME_AS_BODY,
		fontReading: SAME_AS_BODY,
		textSize: "md",
		lineSpacing: "normal",
		radius: "none",
	},
	accessibility: { motion: "system", contrast: "normal" },
	reading: { spoilers: "hide" },
	time: { zone: "club", clock: "auto" },
};

function pick<T extends string>(
	value: unknown,
	allowed: readonly T[],
	fallback: T,
): T {
	return typeof value === "string" &&
		(allowed as readonly string[]).includes(value)
		? (value as T)
		: fallback;
}

function record(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: {};
}

/**
 * Turns anything (stored JSON, old versions, junk) into a valid preference
 * set: unknown or missing values fall back to the defaults.
 */
export function normalizePreferences(input: unknown): UserPreferences {
	const root = record(input);
	const appearance = record(root.appearance);
	const accessibility = record(root.accessibility);
	const reading = record(root.reading);
	const time = record(root.time);
	const defaults = DEFAULT_PREFERENCES;

	return {
		appearance: {
			mode: pick(appearance.mode, COLOR_MODES, defaults.appearance.mode),
			palette: pick(
				appearance.palette,
				PALETTE_IDS,
				defaults.appearance.palette,
			),
			fontBody: pick(
				appearance.fontBody,
				BODY_FONT_IDS,
				defaults.appearance.fontBody,
			),
			fontHeading: pick(
				appearance.fontHeading,
				HEADING_FONT_IDS,
				defaults.appearance.fontHeading,
			),
			fontReading: pick(
				appearance.fontReading,
				READING_FONT_IDS,
				defaults.appearance.fontReading,
			),
			textSize: pick(
				appearance.textSize,
				TEXT_SIZES.map((size) => size.id),
				defaults.appearance.textSize,
			),
			lineSpacing: pick(
				appearance.lineSpacing,
				LINE_SPACINGS.map((spacing) => spacing.id),
				defaults.appearance.lineSpacing,
			),
			radius: pick(
				appearance.radius,
				RADIUS_OPTIONS.map((option) => option.id),
				defaults.appearance.radius,
			),
		},
		accessibility: {
			motion: pick(
				accessibility.motion,
				MOTION_MODES,
				defaults.accessibility.motion,
			),
			contrast: pick(
				accessibility.contrast,
				CONTRAST_MODES,
				defaults.accessibility.contrast,
			),
		},
		reading: {
			spoilers: pick(
				reading.spoilers,
				SPOILER_MODES,
				defaults.reading.spoilers,
			),
		},
		time: {
			zone: pick(time.zone, TIME_ZONE_MODES, defaults.time.zone),
			clock: pick(time.clock, CLOCK_MODES, defaults.time.clock),
		},
	};
}

export function arePreferencesDefault(preferences: UserPreferences): boolean {
	return JSON.stringify(preferences) === JSON.stringify(DEFAULT_PREFERENCES);
}

/** localStorage key shared by the inline boot script and the provider. */
export const PREFERENCES_STORAGE_KEY = "bbrc-preferences";
/** When "1", appearance stays on this device and is not synced to the account. */
export const PREFERENCES_DEVICE_ONLY_KEY = "bbrc-preferences-device-only";

/** The attributes the boot script and provider put on `<html>`. */
export function preferenceAttributes(
	preferences: UserPreferences,
): Record<string, string> {
	return {
		"data-palette": preferences.appearance.palette,
		"data-font-body": preferences.appearance.fontBody,
		"data-font-heading": preferences.appearance.fontHeading,
		"data-font-reading": preferences.appearance.fontReading,
		"data-text-size": preferences.appearance.textSize,
		"data-leading": preferences.appearance.lineSpacing,
		"data-radius": preferences.appearance.radius,
		"data-motion": preferences.accessibility.motion,
		"data-contrast": preferences.accessibility.contrast,
	};
}

/** CSS `font-family` value for a font option (web font variables, then a generic fallback). */
export function fontFamilyFor(id: FontId): string {
	const option = FONT_OPTIONS[id] as FontOption;
	if (!option.cssVar) {
		return option.fallback;
	}
	const vars = [option.cssVar, ...(option.extraCssVars ?? [])];
	return `${vars.map((name) => `var(${name})`).join(", ")}, ${option.fallback}`;
}

/** CSS for fonts, text size, line spacing and motion; generated into the UI package. */
export function buildAppearanceCss(): string {
	const font = fontFamilyFor;

	const blocks: string[] = [
		"/* Generated by scripts/generate-palettes.ts from packages/shared/src/preferences.ts. Do not edit. */",
		`:root {\n\t--app-font-body: ${font("geist-mono")};\n\t--app-font-heading: var(--app-font-body);\n\t--app-font-reading: var(--app-font-body);\n\t--text-scale: 1;\n\t--leading-scale: 1;\n}`,
	];

	for (const id of BODY_FONT_IDS) {
		if (id !== "geist-mono") {
			blocks.push(
				`html[data-font-body="${id}"] {\n\t--app-font-body: ${font(id)};\n}`,
			);
		}
	}
	for (const id of HEADING_FONT_IDS) {
		blocks.push(
			id === SAME_AS_BODY
				? `html[data-font-heading="${id}"] {\n\t--app-font-heading: var(--app-font-body);\n}`
				: `html[data-font-heading="${id}"] {\n\t--app-font-heading: ${font(id)};\n}`,
		);
	}
	for (const id of READING_FONT_IDS) {
		blocks.push(
			id === SAME_AS_BODY
				? `html[data-font-reading="${id}"] {\n\t--app-font-reading: var(--app-font-body);\n}`
				: `html[data-font-reading="${id}"] {\n\t--app-font-reading: ${font(id)};\n}`,
		);
	}
	for (const size of TEXT_SIZES) {
		blocks.push(
			`html[data-text-size="${size.id}"] {\n\t--text-scale: ${size.scale};\n}`,
		);
	}
	for (const option of RADIUS_OPTIONS) {
		if (option.id !== "none") {
			blocks.push(
				`html[data-radius="${option.id}"] {\n\t--radius: ${option.value};\n}`,
			);
		}
	}
	for (const spacing of LINE_SPACINGS) {
		blocks.push(
			`html[data-leading="${spacing.id}"] {\n\t--leading-scale: ${spacing.scale};\n}`,
		);
	}

	return `${blocks.join("\n\n")}\n`;
}

/**
 * Runs before first paint (inline in `<head>`), so palette, fonts and sizes
 * are right without a flash and without reading cookies, which would make
 * every cached page dynamic.
 */
export function buildBootScript(lockedModes: Record<string, string>): string {
	const valid = {
		palette: PALETTE_IDS,
		fontBody: BODY_FONT_IDS,
		fontHeading: HEADING_FONT_IDS,
		fontReading: READING_FONT_IDS,
		textSize: TEXT_SIZES.map((size) => size.id),
		lineSpacing: LINE_SPACINGS.map((spacing) => spacing.id),
		radius: RADIUS_OPTIONS.map((option) => option.id),
		motion: MOTION_MODES,
		contrast: CONTRAST_MODES,
		mode: COLOR_MODES,
	};

	return `(function(){try{
var V=${JSON.stringify(valid)},L=${JSON.stringify(lockedModes)},D=document.documentElement;
var s=JSON.parse(localStorage.getItem(${JSON.stringify(PREFERENCES_STORAGE_KEY)})||"{}")||{};
var a=s.appearance||{},x=s.accessibility||{};
function p(v,l,f){return l.indexOf(v)>-1?v:f}
var pal=p(a.palette,V.palette,${JSON.stringify(DEFAULT_PALETTE_ID)});
D.setAttribute("data-palette",pal);
D.setAttribute("data-font-body",p(a.fontBody,V.fontBody,"geist-mono"));
D.setAttribute("data-font-heading",p(a.fontHeading,V.fontHeading,"body"));
D.setAttribute("data-font-reading",p(a.fontReading,V.fontReading,"body"));
D.setAttribute("data-text-size",p(a.textSize,V.textSize,"md"));
D.setAttribute("data-leading",p(a.lineSpacing,V.lineSpacing,"normal"));
D.setAttribute("data-radius",p(a.radius,V.radius,"none"));
D.setAttribute("data-motion",p(x.motion,V.motion,"system"));
D.setAttribute("data-contrast",p(x.contrast,V.contrast,"normal"));
var eff=L[pal]||p(a.mode,V.mode,"system");
if(localStorage.getItem("theme")!==eff){localStorage.setItem("theme",eff)}
}catch(e){}})();`;
}
