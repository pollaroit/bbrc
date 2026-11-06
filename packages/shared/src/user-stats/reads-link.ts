import { canonicalSubjectKey } from "./subjects";

/*
 * What a click on a stats chart opens: the member's reads page, already filtered. This is
 * the one place that knows how a chart's bar becomes the address's filters (the keys are
 * the reads page's own), so a chart only says what it is showing.
 */

export type ReadsLinkFilter =
	| { kind: "country"; code: string }
	| { kind: "author"; slug: string }
	| { kind: "subject"; subject: string }
	| { kind: "series"; slug: string }
	/** A bar of "Books by page count": `1-100` … `1000+`. */
	| { kind: "pages"; bucket: string }
	/** A bar of "Books by publication period": `1990s`, `20th c.` or `1987`. */
	| { kind: "published"; label: string }
	/** A bar of "Books by club rating": the rating rounded to a half (`4.5`). */
	| { kind: "clubRating"; bucket: string }
	/** A bar of "Reads over time": one month or one whole year. */
	| { kind: "finished"; year: number; month?: number };

/** The period a stats page is showing, carried over so the list matches the chart. */
export type ReadsLinkPeriod =
	| { type: "life" }
	| { type: "none" }
	| { type: "year"; year: number }
	| { type: "month"; year: number; month: number }
	| {
			type: "custom";
			start: { year: number; month: number };
			end: { year: number; month: number };
	  };

const ym = (year: number, month: number) =>
	`${year}-${String(month).padStart(2, "0")}`;

/** The finish-month range of a period, or null when it has none (All time, All books). */
export function periodFinishedRange(
	period: ReadsLinkPeriod | undefined,
): { from: string; to: string } | null {
	if (!period || period.type === "life" || period.type === "none") return null;
	if (period.type === "year") {
		return { from: ym(period.year, 1), to: ym(period.year, 12) };
	}
	if (period.type === "month") {
		return {
			from: ym(period.year, period.month),
			to: ym(period.year, period.month),
		};
	}
	return {
		from: ym(period.start.year, period.start.month),
		to: ym(period.end.year, period.end.month),
	};
}

function ordinalCentury(label: string): number | null {
	const match = /^(\d+)(?:st|nd|rd|th) c\.$/.exec(label);
	return match ? Number(match[1]) : null;
}

/** Filters as the reads page's address keys (`minPages`, `countries`, ...), ready to put in a query string. */
export function readsFilterParams(
	filter: ReadsLinkFilter,
): Record<string, string> | null {
	switch (filter.kind) {
		case "country":
			return { countries: filter.code.toUpperCase() };
		case "author":
			return { authors: filter.slug };
		case "subject": {
			const key = canonicalSubjectKey(filter.subject);
			return key ? { subjectKey: key } : null;
		}
		case "series":
			return { series: filter.slug };
		case "pages": {
			const open = /^(\d+)\+$/.exec(filter.bucket);
			if (open) return { minPages: open[1] as string };
			const range = /^(\d+)-(\d+)$/.exec(filter.bucket);
			return range
				? { minPages: range[1] as string, maxPages: range[2] as string }
				: null;
		}
		case "published": {
			const decade = /^(\d{3})0s$/.exec(filter.label);
			if (decade) {
				const start = Number(`${decade[1]}0`);
				return {
					minPublishedIn: String(start),
					maxPublishedIn: String(start + 9),
				};
			}
			const century = ordinalCentury(filter.label);
			if (century != null) {
				return {
					minPublishedIn: String((century - 1) * 100 + 1),
					maxPublishedIn: String(century * 100),
				};
			}
			if (/^\d{3,4}$/.test(filter.label)) {
				return { minPublishedIn: filter.label, maxPublishedIn: filter.label };
			}
			return null;
		}
		case "clubRating": {
			const value = Number(filter.bucket);
			if (!Number.isFinite(value)) return null;
			// A bar holds ratings rounded to the nearest half star.
			return {
				minAverageRating: String(Math.max(0, value - 0.25)),
				maxAverageRating: String(Math.min(5, value + 0.25)),
			};
		}
		case "finished":
			return filter.month
				? {
						finishedFrom: ym(filter.year, filter.month),
						finishedTo: ym(filter.year, filter.month),
					}
				: { finishedFrom: ym(filter.year, 1), finishedTo: ym(filter.year, 12) };
	}
}

/**
 * `/users/<name>/reads?...` for a chart's bar, with the period carried over (unless the
 * bar itself is a finish date, which is the more specific one).
 */
export function memberReadsHref(
	username: string,
	filter: ReadsLinkFilter,
	period?: ReadsLinkPeriod,
): string | null {
	const params = readsFilterParams(filter);
	if (!params) return null;
	const range = filter.kind === "finished" ? null : periodFinishedRange(period);
	const query = new URLSearchParams({
		...(range ? { finishedFrom: range.from, finishedTo: range.to } : {}),
		...params,
	});
	return `/users/${username}/reads?${query.toString()}`;
}
