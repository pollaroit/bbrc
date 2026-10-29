import type { TierlistColor } from "@bbrc/shared";

/**
 * The classes for each tier colour. Written out in full (never built from the
 * key) so Tailwind can see them, and made only of theme tokens so every palette
 * keeps them readable.
 */
export const TIER_COLOR_CLASSES: Record<
	TierlistColor,
	{ name: string; label: string; swatch: string }
> = {
	destructive: {
		name: "Red",
		label: "border-destructive/30 bg-destructive/10 text-destructive-ink",
		swatch: "bg-destructive",
	},
	orange: {
		name: "Orange",
		label: "border-orange/30 bg-orange/10 text-orange-ink",
		swatch: "bg-orange",
	},
	warning: {
		name: "Yellow",
		label: "border-warning/30 bg-warning/10 text-warning-ink",
		swatch: "bg-warning",
	},
	success: {
		name: "Green",
		label: "border-success/30 bg-success/10 text-success-ink",
		swatch: "bg-success",
	},
	teal: {
		name: "Teal",
		label: "border-teal/30 bg-teal/10 text-teal-ink",
		swatch: "bg-teal",
	},
	info: {
		name: "Blue",
		label: "border-info/30 bg-info/10 text-info-ink",
		swatch: "bg-info",
	},
	violet: {
		name: "Violet",
		label: "border-violet/30 bg-violet/10 text-violet-ink",
		swatch: "bg-violet",
	},
	pink: {
		name: "Pink",
		label: "border-pink/30 bg-pink/10 text-pink-ink",
		swatch: "bg-pink",
	},
};

export function tierColorClasses(color: string) {
	return TIER_COLOR_CLASSES[color as TierlistColor] ?? TIER_COLOR_CLASSES.info;
}
