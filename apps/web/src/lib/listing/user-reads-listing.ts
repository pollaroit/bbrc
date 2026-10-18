import type {
	GetBookListAuthorFacetsInput,
	GetBookListCountryFacetsInput,
} from "@bbrc/api/modules/book/book.schema";
import type { ListUserReadsInput } from "@bbrc/api/modules/read/read.schema";
import { userReadSortableFields } from "@bbrc/api/modules/read/read.schema";
import type { ExportUserReadsInput } from "@bbrc/api/modules/read/read-export.schema";
import {
	parseAsArrayOf,
	parseAsBoolean,
	parseAsFloat,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import {
	type BookListingStatus,
	bookRangeByLabels,
	bookStatuses,
	bookStatusFilterLabels,
	normalizeAuthorSlugs,
	normalizeCountryCodes,
} from "@/lib/listing/books-listing";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";
import type { FieldLabels } from "@/lib/listing/labels";
import {
	createRangeByParser,
	createSortByParser,
	rangeMaxParser,
	rangeMinParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export const userReadSortByLabels = {
	readEndMonth: "Finish month",
	recordedAt: "Logged in app",
	title: "Title",
	pages: "Page count",
	averageRating: "Club rating",
	openLibraryRating: "Open Library rating",
	publishedIn: "Publication year",
	"feedbacks._count": "Feedbacks",
	"favorites._count": "Favorites",
	"reads._count": "Reads",
} as const satisfies FieldLabels<(typeof userReadSortableFields)[number]>;

export const userReadListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	sortBy: createSortByParser(userReadSortableFields)
		.withDefault("readEndMonth")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser
		.withDefault("desc")
		.withOptions({ shallow: false }),
	rangeBy: createRangeByParser(["createdAt", "updatedAt"] as const).withOptions(
		{ shallow: false },
	),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(parseAsStringLiteral(bookStatuses)).withOptions({
		shallow: false,
	}),
	minOpenLibraryRating: parseAsFloat.withOptions({ shallow: false }),
	maxOpenLibraryRating: parseAsFloat.withOptions({ shallow: false }),
	minPages: parseAsInteger.withOptions({ shallow: false }),
	maxPages: parseAsInteger.withOptions({ shallow: false }),
	minReads: parseAsInteger.withOptions({ shallow: false }),
	maxReads: parseAsInteger.withOptions({ shallow: false }),
	authors: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	countries: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	mutualOnly: parseAsBoolean.withDefault(false).withOptions({ shallow: false }),
};

export function useUserReadsListingSearchParams() {
	return useQueryStates(userReadListingSearchParams, { shallow: false });
}

export type UserReadsListingSearchParams = ReturnType<
	typeof useUserReadsListingSearchParams
>[0];

export function toUserReadsListCallInput(
	params: UserReadsListingSearchParams,
): Partial<ListUserReadsInput> {
	return buildListCallInput({
		search: params.search,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		minOpenLibraryRating: params.minOpenLibraryRating,
		maxOpenLibraryRating: params.maxOpenLibraryRating,
		minPages: params.minPages,
		maxPages: params.maxPages,
		minReads: params.minReads,
		maxReads: params.maxReads,
		authors: normalizeAuthorSlugs(params.authors),
		countries: normalizeCountryCodes(params.countries),
		mutualOnly: params.mutualOnly ? true : undefined,
		limit: 12,
	}) as Partial<ListUserReadsInput>;
}

export function toUserReadsExportCallInput(
	params: UserReadsListingSearchParams,
): Partial<ExportUserReadsInput> {
	const listInput = toUserReadsListCallInput(params);
	const { limit: _limit, ...rest } = listInput;
	return rest;
}

export function toUserReadsAuthorFacetsInput(
	params: UserReadsListingSearchParams,
): Partial<GetBookListAuthorFacetsInput> {
	const listInput = toUserReadsListCallInput(params);
	const {
		authors: selectedAuthors,
		countries: _countries,
		limit: _limit,
		cursor: _cursor,
		...rest
	} = listInput;

	return buildListCallInput({
		...rest,
		pinnedAuthorSlugs: selectedAuthors,
	}) as Partial<GetBookListAuthorFacetsInput>;
}

export function toUserReadsCountryFacetsInput(
	params: UserReadsListingSearchParams,
): Partial<GetBookListCountryFacetsInput> {
	const listInput = toUserReadsListCallInput(params);
	const {
		countries: selectedCountries,
		limit: _limit,
		cursor: _cursor,
		...rest
	} = listInput;

	return buildListCallInput({
		...rest,
		pinnedCountryCodes: selectedCountries,
	}) as Partial<GetBookListCountryFacetsInput>;
}

export function countUserReadsSheetFilters(
	params: UserReadsListingSearchParams,
): number {
	let count = 0;

	if (params.statuses && params.statuses.length > 0) {
		count += 1;
	}

	if (
		params.minOpenLibraryRating != null ||
		params.maxOpenLibraryRating != null
	) {
		count += 1;
	}

	if (params.minPages != null || params.maxPages != null) {
		count += 1;
	}

	if (params.minReads != null || params.maxReads != null) {
		count += 1;
	}

	if (params.authors && params.authors.length > 0) {
		count += 1;
	}

	if (params.countries && params.countries.length > 0) {
		count += 1;
	}

	if (params.rangeMin != null || params.rangeMax != null) {
		count += 1;
	}

	if (params.mutualOnly) {
		count += 1;
	}

	return count;
}

export function clearUserReadsSheetFilters(
	setParams: ReturnType<typeof useUserReadsListingSearchParams>[1],
) {
	void setParams({
		statuses: null,
		minOpenLibraryRating: null,
		maxOpenLibraryRating: null,
		minPages: null,
		maxPages: null,
		minReads: null,
		maxReads: null,
		authors: null,
		countries: null,
		rangeBy: null,
		rangeMin: null,
		rangeMax: null,
		mutualOnly: false,
	});
}

export function toggleUserReadsStatus(
	params: UserReadsListingSearchParams,
	setParams: ReturnType<typeof useUserReadsListingSearchParams>[1],
	status: BookListingStatus,
	checked: boolean,
) {
	const current = params.statuses ?? [];
	const next = checked
		? [...new Set([...current, status])]
		: current.filter((value) => value !== status);

	void setParams({
		statuses: next.length > 0 ? next : null,
	});
}

export {
	bookRangeByLabels as userReadRangeByLabels,
	bookStatuses,
	bookStatusFilterLabels,
};
