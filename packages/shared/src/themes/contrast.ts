import {
	compositeOver,
	contrastOn,
	contrastRgb,
	type Oklch,
	oklch,
	oklchToSrgb,
} from "./oklch";

/** Main reading text. */
const AA_TEXT = 4.5;
/** Secondary text: small, but short and rarely long-read. */
const SECONDARY_TEXT = 4;
/** Button labels and text on hover and selection surfaces: short, medium weight. */
const SURFACE_TEXT = 3.5;
const AA_GRAPHIC = 3;
/** Amber has always been light; it is used for stars and tints, not text. */
const WARNING_GRAPHIC = 1.7;
/** Status icons always sit next to a text label, so they only need to be visible. */
const STATUS_GRAPHIC = 2.5;

const STATUS_NAMES = [
	"success",
	"warning",
	"info",
	"destructive",
	"violet",
	"pink",
	"orange",
	"teal",
] as const;

/**
 * Checks the colour pairs the app relies on. Returns a list of problems
 * (empty when the palette is readable); used by the tests and by the preset
 * importer, so a palette that would make text hard to read never ships.
 */
export function paletteContrastProblems(
	tokens: Record<string, Oklch>,
): string[] {
	const problems: string[] = [];
	const get = (name: string) => tokens[name] as Oklch;

	const check = (
		name: string,
		fg: Oklch | undefined,
		bg: Oklch | undefined,
		min: number,
	) => {
		if (!fg || !bg) {
			problems.push(`${name}: missing colour`);
			return;
		}
		const ratio = contrastOn(fg, bg);
		if (ratio < min) {
			problems.push(`${name}: ${ratio.toFixed(2)} (needs ${min})`);
		}
	};

	check(
		"foreground on background",
		tokens.foreground,
		tokens.background,
		AA_TEXT,
	);
	check(
		"card-foreground on card",
		tokens["card-foreground"],
		tokens.card,
		AA_TEXT,
	);
	check(
		"popover-foreground on popover",
		tokens["popover-foreground"],
		tokens.popover,
		AA_TEXT,
	);
	check("foreground on muted", tokens.foreground, tokens.muted, SECONDARY_TEXT);
	check(
		"secondary-foreground on secondary",
		tokens["secondary-foreground"],
		tokens.secondary,
		SURFACE_TEXT,
	);
	check(
		"accent-foreground on accent",
		tokens["accent-foreground"],
		tokens.accent,
		SURFACE_TEXT,
	);
	check(
		"muted-foreground on background",
		tokens["muted-foreground"],
		tokens.background,
		SECONDARY_TEXT,
	);
	check(
		"muted-foreground on card",
		tokens["muted-foreground"],
		tokens.card,
		SECONDARY_TEXT,
	);
	check(
		"muted-foreground on muted",
		tokens["muted-foreground"],
		tokens.muted,
		SECONDARY_TEXT,
	);
	check(
		"primary-foreground on primary",
		tokens["primary-foreground"],
		tokens.primary,
		SURFACE_TEXT,
	);
	check("primary on background", tokens.primary, tokens.background, AA_GRAPHIC);

	if (problems.some((problem) => problem.includes("missing colour"))) {
		return problems;
	}

	for (const name of STATUS_NAMES) {
		const mid = get(name);
		const ink = get(`${name}-ink`);
		for (const [label, backdrop] of [
			["background", get("background")],
			["card", get("card")],
		] as const) {
			const surface = compositeOver(oklch(mid.l, mid.c, mid.h, 0.15), backdrop);
			const ratio = contrastRgb(oklchToSrgb(ink), surface);
			if (ratio < AA_TEXT) {
				problems.push(
					`${name}-ink on ${name} tint over ${label}: ${ratio.toFixed(2)} (needs ${SECONDARY_TEXT})`,
				);
			}
		}
		check(
			`${name} as an icon on background`,
			mid,
			get("background"),
			name === "warning" ? WARNING_GRAPHIC : STATUS_GRAPHIC,
		);
	}

	return problems;
}

type PairRule = { background: string; min: number };

/** Text colours and the surfaces they sit on. Backgrounds are never changed. */
const TEXT_RULES: Record<string, PairRule[]> = {
	foreground: [
		{ background: "background", min: AA_TEXT },
		{ background: "muted", min: SECONDARY_TEXT },
	],
	"card-foreground": [{ background: "card", min: AA_TEXT }],
	"popover-foreground": [{ background: "popover", min: AA_TEXT }],
	"muted-foreground": [
		{ background: "background", min: SECONDARY_TEXT },
		{ background: "card", min: SECONDARY_TEXT },
		{ background: "muted", min: SECONDARY_TEXT },
	],
	"secondary-foreground": [{ background: "secondary", min: SURFACE_TEXT }],
	"accent-foreground": [{ background: "accent", min: SURFACE_TEXT }],
	"primary-foreground": [{ background: "primary", min: SURFACE_TEXT }],
};

const MAX_LIGHTNESS_SHIFT = 0.35;
const STEP = 0.01;

/** Moves `color`'s lightness away from a backdrop until `satisfied` holds, or gives up. */
function nudge(
	color: Oklch,
	towardLight: boolean,
	satisfied: (candidate: Oklch) => boolean,
): Oklch | null {
	for (let shift = STEP; shift <= MAX_LIGHTNESS_SHIFT; shift += STEP) {
		const l = Math.min(
			1,
			Math.max(0, color.l + (towardLight ? shift : -shift)),
		);
		const candidate = { ...color, l };
		if (satisfied(candidate)) {
			return candidate;
		}
	}
	return null;
}

/**
 * Lightly adjusts an imported palette so it passes `paletteContrastProblems`:
 * only text colours (and the primary or destructive accent when used as an
 * icon) move, in small lightness steps. Returns what changed, so the importer
 * can report it; anything that cannot be fixed is left for the checker to flag.
 */
export function repairPaletteTokens(input: Record<string, Oklch>): {
	tokens: Record<string, Oklch>;
	adjusted: string[];
} {
	const tokens = { ...input };
	const adjusted: string[] = [];
	const background = tokens.background;
	if (!background) {
		return { tokens, adjusted };
	}
	const lightTheme = background.l > 0.6;

	// Accents used as icons or links first, since button text depends on `primary`.
	for (const name of ["primary", "destructive"] as const) {
		const color = tokens[name];
		if (color && contrastOn(color, background) < AA_GRAPHIC) {
			const fixed = nudge(
				color,
				!lightTheme,
				(candidate) => contrastOn(candidate, background) >= AA_GRAPHIC,
			);
			if (fixed) {
				tokens[name] = fixed;
				adjusted.push(name);
			}
		}
	}

	for (const [name, rules] of Object.entries(TEXT_RULES)) {
		const color = tokens[name];
		if (!color || rules.some((rule) => !tokens[rule.background])) {
			continue;
		}
		const passes = (candidate: Oklch) =>
			rules.every(
				(rule) =>
					contrastOn(candidate, tokens[rule.background] as Oklch) >= rule.min,
			);
		if (passes(color)) {
			continue;
		}

		// Move the text away from the surfaces it sits on: lighter on dark ones.
		const surfaceLightness =
			rules.reduce(
				(sum, rule) => sum + (tokens[rule.background] as Oklch).l,
				0,
			) / rules.length;
		const fixed = nudge(color, surfaceLightness < 0.6, passes);
		if (fixed) {
			tokens[name] = fixed;
			adjusted.push(name);
		}
	}

	return { tokens, adjusted };
}
