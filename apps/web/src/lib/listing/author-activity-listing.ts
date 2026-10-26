import type {
	AuthorReadsInput,
	AuthorReviewsInput,
} from "@bbrc/api/modules/author/author.schema";
import {
	parseAsArrayOf,
	parseAsBoolean,
	parseAsFloat,
	parseAsInteger,
	parseAsIsoDate,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { useEffect, useState } from "react";
import { normalizeSubjectSlugs } from "@/lib/listing/books-listing";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";
import type { FieldLabels } from "@/lib/listing/labels";
import { searchParser, sortDirectionParser } from "@/lib/listing/parsers";

/**
 * URL state of the author's Reads and Reviews tabs. These pages render on the client, so the
 * parsers stay shallow (changing a filter never asks the server for the page again).
 */

export const authorReadSortFields = [
	"finishedAt",
	"loggedAt",
	"book",
	"member",
] as const;

export const authorReviewSortFields = [
	"createdAt",
	"rating",
	"likes",
	"comments",
	"book",
] as const;

export const authorReadSortLabels = {
	finishedAt: "Finished reading",
	loggedAt: "Logged in the app",
	book: "Book title",
	member: "Member",
} as const satisfies FieldLabels<(typeof authorReadSortFields)[number]>;

export const authorReviewSortLabels = {
	createdAt: "Date written",
	rating: "Rating",
	likes: "Likes",
	comments: "Comments",
	book: "Book title",
} as const satisfies FieldLabels<(typeof authorReviewSortFields)[number]>;

export const authorReviewTypeValues = ["written", "rating_only"] as const;
export const authorSpoilerValues = ["only", "hide"] as const;
export const authorSubjectMatchValues = ["any", "all"] as const;

/** Book filters both tabs share (the same meaning as on /books). */
const bookFilterParsers = {
	subjects: parseAsArrayOf(parseAsString),
	subjectsMatch: parseAsStringLiteral(authorSubjectMatchValues),
	countries: parseAsArrayOf(parseAsString),
	minPages: parseAsInteger,
	maxPages: parseAsInteger,
	minPublishedIn: parseAsInteger,
	maxPublishedIn: parseAsInteger,
	minAverageRating: parseAsFloat,
	maxAverageRating: parseAsFloat,
};

const commonParsers = {
	search: searchParser.withOptions({ throttleMs: 300 }),
	members: parseAsArrayOf(parseAsString),
	books: parseAsArrayOf(parseAsString),
	series: parseAsArrayOf(parseAsString),
	...bookFilterParsers,
};

export const authorReadDensityValues = ["comfortable", "compact"] as const;

export const authorReadsSearchParams = {
	...commonParsers,
	density: parseAsStringLiteral(authorReadDensityValues),
	finishedFrom: parseAsIsoDate,
	finishedTo: parseAsIsoDate,
	loggedFrom: parseAsIsoDate,
	loggedTo: parseAsIsoDate,
	sortBy: parseAsStringLiteral(authorReadSortFields),
	sortDirection: sortDirectionParser,
};

export const authorReviewsSearchParams = {
	...commonParsers,
	minRating: parseAsFloat,
	maxRating: parseAsFloat,
	reviewType: parseAsStringLiteral(authorReviewTypeValues),
	hasImage: parseAsBoolean,
	spoilers: parseAsStringLiteral(authorSpoilerValues),
	createdFrom: parseAsIsoDate,
	createdTo: parseAsIsoDate,
	sortBy: parseAsStringLiteral(authorReviewSortFields),
	sortDirection: sortDirectionParser,
};

export function useAuthorReadsParams() {
	return useQueryStates(authorReadsSearchParams);
}

export function useAuthorReviewsParams() {
	return useQueryStates(authorReviewsSearchParams);
}

export type AuthorReadsParams = ReturnType<typeof useAuthorReadsParams>[0];
export type AuthorReviewsParams = ReturnType<typeof useAuthorReviewsParams>[0];

/** The slice of the URL state both tabs use for the book filter group. */
export type AuthorBookFilterParams = {
	subjects: string[] | null;
	subjectsMatch: (typeof authorSubjectMatchValues)[number] | null;
	countries: string[] | null;
	minPages: number | null;
	maxPages: number | null;
	minPublishedIn: number | null;
	maxPublishedIn: number | null;
	minAverageRating: number | null;
	maxAverageRating: number | null;
};

export type AuthorBookFilterSetter = (
	values: Partial<{
		[K in keyof AuthorBookFilterParams]: AuthorBookFilterParams[K] | null;
	}>,
) => unknown;

export const AUTHOR_BOOK_FILTER_RESET = {
	subjects: null,
	subjectsMatch: null,
	countries: null,
	minPages: null,
	maxPages: null,
	minPublishedIn: null,
	maxPublishedIn: null,
	minAverageRating: null,
	maxAverageRating: null,
} as const;

export function countAuthorBookFilters(params: AuthorBookFilterParams): number {
	let count = 0;
	if (params.subjects && params.subjects.length > 0) count += 1;
	if (params.countries && params.countries.length > 0) count += 1;
	if (params.minPages != null || params.maxPages != null) count += 1;
	if (params.minPublishedIn != null || params.maxPublishedIn != null)
		count += 1;
	if (params.minAverageRating != null || params.maxAverageRating != null) {
		count += 1;
	}
	return count;
}

function bookFilterInput(params: AuthorBookFilterParams) {
	return {
		subjects: normalizeSubjectSlugs(params.subjects),
		subjectsMatch:
			params.subjects && params.subjects.length > 1
				? (params.subjectsMatch ?? "any")
				: undefined,
		countries:
			params.countries && params.countries.length > 0
				? params.countries
				: undefined,
		minPages: params.minPages ?? undefined,
		maxPages: params.maxPages ?? undefined,
		minPublishedIn: params.minPublishedIn ?? undefined,
		maxPublishedIn: params.maxPublishedIn ?? undefined,
		minAverageRating: params.minAverageRating ?? undefined,
		maxAverageRating: params.maxAverageRating ?? undefined,
	};
}

/** What `author.bookFacets` needs: the book filters, minus the cursor. */
export function toAuthorBookFacetsInput(
	slug: string,
	params: AuthorBookFilterParams,
) {
	return { slug, ...buildListCallInput(bookFilterInput(params)) };
}

export function toAuthorReadsInput(
	slug: string,
	params: AuthorReadsParams,
	search: string | null,
): Omit<AuthorReadsInput, "limit" | "cursor"> {
	return buildListCallInput({
		slug,
		search: search?.trim() || undefined,
		members: params.members ?? undefined,
		books: params.books ?? undefined,
		series: params.series ?? undefined,
		...bookFilterInput(params),
		finishedFrom: params.finishedFrom,
		finishedTo: params.finishedTo,
		loggedFrom: params.loggedFrom,
		loggedTo: params.loggedTo,
		sortBy: params.sortBy ?? "finishedAt",
		sortDirection: params.sortDirection ?? "desc",
	}) as Omit<AuthorReadsInput, "limit" | "cursor">;
}

export function toAuthorReviewsInput(
	slug: string,
	params: AuthorReviewsParams,
	search: string | null,
): Omit<AuthorReviewsInput, "limit" | "cursor"> {
	return buildListCallInput({
		slug,
		search: search?.trim() || undefined,
		members: params.members ?? undefined,
		books: params.books ?? undefined,
		series: params.series ?? undefined,
		...bookFilterInput(params),
		minRating: params.minRating,
		maxRating: params.maxRating,
		reviewType: params.reviewType,
		hasImage: params.hasImage === true ? true : undefined,
		spoilers: params.spoilers,
		createdFrom: params.createdFrom,
		createdTo: params.createdTo,
		sortBy: params.sortBy ?? "createdAt",
		sortDirection: params.sortDirection ?? "desc",
	}) as Omit<AuthorReviewsInput, "limit" | "cursor">;
}

/** The text of a search box after the typing pauses, so each keystroke is not a request. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}
