import { CUMULATIVE_METRICS, STATS_TABS } from "@bbrc/shared";
import { parseAsArrayOf, parseAsStringLiteral, useQueryState } from "nuqs";

/*
 * Everything a stats page remembers lives in the address, so a reload, the back
 * button and a shared link land on the same view (see AGENTS.md). The period itself
 * is in `lib/user-stats-search-params.ts`; this file holds the rest.
 */

export const paceMetrics = ["books", "pages"] as const;
export type PaceMetric = (typeof paceMetrics)[number];

export const publicationModes = ["year", "decade", "century"] as const;
export type PublicationMode = (typeof publicationModes)[number];

export function useStatsTab() {
	return useQueryState(
		"tab",
		parseAsStringLiteral(STATS_TABS)
			.withDefault("overview")
			.withOptions({ history: "replace", clearOnDefault: true }),
	);
}

/** Which cumulative metrics are drawn; one or several at once. */
export function useCumulativeMetrics() {
	return useQueryState(
		"metrics",
		parseAsArrayOf(parseAsStringLiteral(CUMULATIVE_METRICS))
			.withDefault(["books"])
			.withOptions({ history: "replace", clearOnDefault: true }),
	);
}

export function usePaceMetric() {
	return useQueryState(
		"pace",
		parseAsStringLiteral(paceMetrics)
			.withDefault("books")
			.withOptions({ history: "replace", clearOnDefault: true }),
	);
}

export function usePublicationMode() {
	return useQueryState(
		"publication",
		parseAsStringLiteral(publicationModes)
			.withDefault("decade")
			.withOptions({ history: "replace", clearOnDefault: true }),
	);
}
