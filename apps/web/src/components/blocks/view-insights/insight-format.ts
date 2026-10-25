import type { ViewInsights } from "@bbrc/api/modules/view/view.schema";
import type { InsightRange, ViewResourceKind } from "@bbrc/shared";

const numberFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

export const formatCount = (value: number) => numberFormat.format(value);
export const formatCompact = (value: number) =>
	value >= 10_000 ? compactFormat.format(value) : numberFormat.format(value);

export const RANGE_OPTIONS: { id: InsightRange; label: string }[] = [
	{ id: "7d", label: "7 days" },
	{ id: "30d", label: "30 days" },
	{ id: "90d", label: "90 days" },
	{ id: "all", label: "All time" },
];

export const RANGE_PHRASE: Record<InsightRange, string> = {
	"7d": "the last 7 days",
	"30d": "the last 30 days",
	"90d": "the last 90 days",
	all: "all time",
};

export const RESOURCE_NOUN: Record<ViewResourceKind, string> = {
	book: "book",
	post: "post",
	shelf: "shelf",
	review: "review",
	user: "profile",
};

export type Delta = {
	/** Whole percent change; null when it cannot be expressed as a percentage. */
	percent: number | null;
	direction: "up" | "down" | "flat";
	/** The previous period was empty and this one is not. */
	fresh: boolean;
};

/** Change since the previous period; null when there is nothing to compare. */
export function deltaOf(
	current: number,
	previous: number | null,
): Delta | null {
	if (previous == null) return null;
	if (previous === 0) {
		return current === 0
			? null
			: { percent: null, direction: "up", fresh: true };
	}
	const percent = Math.round(((current - previous) / previous) * 100);
	return {
		percent,
		direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat",
		fresh: false,
	};
}

export type Totals = ViewInsights["totals"];

/** `2026-10-25` to `Oct 25`. */
export function shortDay(key: string) {
	return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

export function longDay(key: string) {
	return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});
}

export function hourLabel(hour: number) {
	const suffix = hour < 12 ? "am" : "pm";
	return `${hour % 12 === 0 ? 12 : hour % 12}${suffix}`;
}
