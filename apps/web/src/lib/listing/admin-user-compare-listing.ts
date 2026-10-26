import type { CompareStatsFilters } from "@bbrc/api/modules/user-compare-admin/user-compare-admin.schema";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import {
	fromDayKey,
	rangeToQuery,
} from "@/components/blocks/author/author-insights-filters";

/**
 * URL state of the admin compare pages. Both pages render on the client, so the parsers stay
 * shallow (changing a filter never asks the server for the page again).
 */

/** `/admin/users/compare`: the two members being compared. */
export const adminCompareParsers = {
	a: parseAsString,
	b: parseAsString,
};

export function useAdminCompareSearchParams() {
	return useQueryStates(adminCompareParsers, { clearOnDefault: true });
}

/** `/admin/users/compare/stats`: which reads count toward the club's scores. */
export const adminCompareStatsParsers = {
	users: parseAsArrayOf(parseAsString),
	books: parseAsArrayOf(parseAsString),
	authors: parseAsArrayOf(parseAsString),
	series: parseAsArrayOf(parseAsString),
	subjects: parseAsArrayOf(parseAsString),
	from: parseAsString,
	to: parseAsString,
};

export type AdminCompareStatsParams = {
	users: string[] | null;
	books: string[] | null;
	authors: string[] | null;
	series: string[] | null;
	subjects: string[] | null;
	from: string | null;
	to: string | null;
};

export function useAdminCompareStatsSearchParams() {
	return useQueryStates(adminCompareStatsParsers, { clearOnDefault: true });
}

export function countAdminCompareFilters(params: AdminCompareStatsParams) {
	return (
		(params.users?.length ?? 0) +
		(params.books?.length ?? 0) +
		(params.authors?.length ?? 0) +
		(params.series?.length ?? 0) +
		(params.subjects?.length ?? 0) +
		(params.from || params.to ? 1 : 0)
	);
}

function list(values: string[] | null) {
	return values && values.length > 0 ? values : undefined;
}

/** The API's filter object for the current address. Empty filters are left out (the default is "all"). */
export function toAdminCompareStatsFilters(
	params: AdminCompareStatsParams,
): CompareStatsFilters {
	const range = rangeToQuery({ from: params.from, to: params.to });
	const users = list(params.users);
	const books = list(params.books);
	const authors = list(params.authors);
	const series = list(params.series);
	const subjects = list(params.subjects);

	return {
		...(users ? { users } : {}),
		...(books ? { books } : {}),
		...(authors ? { authors } : {}),
		...(series ? { series } : {}),
		...(subjects ? { subjects } : {}),
		...(range.rangeMin ? { finishedFrom: range.rangeMin } : {}),
		...(range.rangeMax ? { finishedTo: range.rangeMax } : {}),
	};
}

/** A readable label for a slug when the real title is not at hand ("war-and-peace" → "War and peace"). */
export function labelFromSlug(slug: string) {
	const text = slug.replace(/[-_]+/g, " ").trim();
	return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : slug;
}

/** True when a day key in the address is a real day (a hand-edited address cannot break the page). */
export function isValidDayKey(value: string | null) {
	return value != null && fromDayKey(value) != null;
}

/** The address of the admin compare page for a pair. */
export function adminComparePairHref(a: string, b: string) {
	return `/admin/users/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
}
