"use client";

import {
	memberReadsHref,
	type ReadsLinkFilter,
	type ReadsLinkPeriod,
} from "@bbrc/shared";
import { useCallback } from "react";
import { parseYearMonth } from "@/lib/user-stats-period-ui";
import { useUserStatsSearchParams } from "@/lib/user-stats-search-params";

/** The period the page is showing, as the link builder wants it. */
export function useStatsLinkPeriod(): ReadsLinkPeriod {
	const [params] = useUserStatsSearchParams();
	if (params.period_type === "year" && /^\d{4}$/.test(params.period ?? "")) {
		return { type: "year", year: Number(params.period) };
	}
	if (params.period_type === "month") {
		const month = parseYearMonth(params.period);
		if (month) return { type: "month", ...month };
	}
	if (params.period_type === "custom") {
		const start = parseYearMonth(params.period_start);
		const end = parseYearMonth(params.period_end);
		if (start && end) return { type: "custom", start, end };
	}
	return params.period_type === "none" ? { type: "none" } : { type: "life" };
}

/** The year a month-by-month chart is showing, when the period sits inside one year. */
export function singleYearOf(period: ReadsLinkPeriod): number | null {
	if (period.type === "year" || period.type === "month") return period.year;
	if (period.type === "custom" && period.start.year === period.end.year) {
		return period.start.year;
	}
	return null;
}

/**
 * `(filter) => href`: where a click on a stats chart goes, the member's reads already
 * filtered and with the page's period carried over. Null when the bar has no list.
 */
export function useReadsHref(username: string) {
	const period = useStatsLinkPeriod();
	return useCallback(
		(filter: ReadsLinkFilter) => memberReadsHref(username, filter, period),
		[username, period],
	);
}
