import type { TierlistColor } from "@bbrc/shared";

/**
 * The classes for each tier colour. Written out in full (never built from the
 * key) so Tailwind can see them. They use the dedicated `tier-*` theme tokens,
 * which every palette defines the same way, so all eight stay different.
 */
export const TIER_COLOR_CLASSES: Record<
	TierlistColor,
	{ name: string; label: string; swatch: string }
> = {
	red: {
		name: "Red",
		label: "border-tier-red/30 bg-tier-red/10 text-tier-red-ink",
		swatch: "bg-tier-red",
	},
	orange: {
		name: "Orange",
		label: "border-tier-orange/30 bg-tier-orange/10 text-tier-orange-ink",
		swatch: "bg-tier-orange",
	},
	yellow: {
		name: "Yellow",
		label: "border-tier-yellow/30 bg-tier-yellow/10 text-tier-yellow-ink",
		swatch: "bg-tier-yellow",
	},
	green: {
		name: "Green",
		label: "border-tier-green/30 bg-tier-green/10 text-tier-green-ink",
		swatch: "bg-tier-green",
	},
	teal: {
		name: "Teal",
		label: "border-tier-teal/30 bg-tier-teal/10 text-tier-teal-ink",
		swatch: "bg-tier-teal",
	},
	blue: {
		name: "Blue",
		label: "border-tier-blue/30 bg-tier-blue/10 text-tier-blue-ink",
		swatch: "bg-tier-blue",
	},
	violet: {
		name: "Violet",
		label: "border-tier-violet/30 bg-tier-violet/10 text-tier-violet-ink",
		swatch: "bg-tier-violet",
	},
	pink: {
		name: "Pink",
		label: "border-tier-pink/30 bg-tier-pink/10 text-tier-pink-ink",
		swatch: "bg-tier-pink",
	},
};

export function tierColorClasses(color: string) {
	return TIER_COLOR_CLASSES[color as TierlistColor] ?? TIER_COLOR_CLASSES.blue;
}
