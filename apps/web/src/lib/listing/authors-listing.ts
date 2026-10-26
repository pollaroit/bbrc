import type {
	AuthorListInput,
	AuthorNationalityFacetsInput,
} from "@bbrc/api/modules/author/author.schema";
import { authorDirectorySortFields } from "@bbrc/api/modules/author/author-directory.listing";
import { bookCountryCodeSchema } from "@bbrc/shared";
import {
	parseAsArrayOf,
	parseAsBoolean,
	parseAsFloat,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";
import type { FieldLabels } from "@/lib/listing/labels";
import {
	createSortByParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export type AuthorSortField = (typeof authorDirectorySortFields)[number];

/** Re-exported as a plain list for the sort menu. */
export const authorDirectorySortFieldsList = authorDirectorySortFields;

export const authorSortByLabels = {
	name: "Name",
	bookCount: "Books",
	readerCount: "Readers",
	readCount: "Reads",
	pageCount: "Total pages",
	reviewCount: "Reviews",
	averageRating: "Average rating",
	followerCount: "Followers",
	createdAt: "Recently added",
	birthYear: "Birth year",
} as const satisfies FieldLabels<AuthorSortField>;

export const AUTHOR_GENDER_FILTERS = [
	"female",
	"male",
	"non_binary",
	"other",
] as const;

export const authorGenderLabels = {
	female: "Women",
	male: "Men",
	non_binary: "Non-binary",
	other: "Other",
} as const satisfies FieldLabels<(typeof AUTHOR_GENDER_FILTERS)[number]>;

export const AUTHOR_STATUS_FILTERS = [
	"verified",
	"auto",
	"needs_review",
] as const;

export const authorStatusLabels = {
	verified: "Verified",
	auto: "Filled in automatically",
	needs_review: "Needs review",
} as const satisfies FieldLabels<(typeof AUTHOR_STATUS_FILTERS)[number]>;

export const AUTHORS_PAGE_SIZE = 24;

export const authorsListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	sortBy: createSortByParser(authorDirectorySortFields)
		.withDefault("bookCount")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser
		.withDefault("desc")
		.withOptions({ shallow: false }),
	minBooks: parseAsInteger.withOptions({ shallow: false }),
	minReaders: parseAsInteger.withOptions({ shallow: false }),
	minReads: parseAsInteger.withOptions({ shallow: false }),
	minReviews: parseAsInteger.withOptions({ shallow: false }),
	minPages: parseAsInteger.withOptions({ shallow: false }),
	maxPages: parseAsInteger.withOptions({ shallow: false }),
	minRating: parseAsFloat.withOptions({ shallow: false }),
	maxRating: parseAsFloat.withOptions({ shallow: false }),
	countries: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	genders: parseAsArrayOf(
		parseAsStringLiteral(AUTHOR_GENDER_FILTERS),
	).withOptions({ shallow: false }),
	hasPhoto: parseAsBoolean.withOptions({ shallow: false }),
	/** Admins only; ignored by the server for everyone else. */
	statuses: parseAsArrayOf(
		parseAsStringLiteral(AUTHOR_STATUS_FILTERS),
	).withOptions({ shallow: false }),
};

export function useAuthorsListingSearchParams() {
	return useQueryStates(authorsListingSearchParams, { shallow: false });
}

export type AuthorsListingSearchParams = ReturnType<
	typeof useAuthorsListingSearchParams
>[0];

export function normalizeCountryCodes(
	countries: string[] | null | undefined,
): string[] | undefined {
	if (!countries || countries.length === 0) {
		return undefined;
	}

	const codes = countries.flatMap((code) => {
		const parsed = bookCountryCodeSchema.safeParse(code);
		return parsed.success ? [parsed.data] : [];
	});

	return codes.length > 0 ? codes : undefined;
}

function toFilterInput(params: AuthorsListingSearchParams) {
	return buildListCallInput({
		search: params.search,
		minBooks: params.minBooks,
		minReaders: params.minReaders,
		minReads: params.minReads,
		minReviews: params.minReviews,
		minPages: params.minPages,
		maxPages: params.maxPages,
		minAverageRating: params.minRating,
		maxAverageRating: params.maxRating,
		countries: normalizeCountryCodes(params.countries),
		genders: params.genders,
		hasPhoto: params.hasPhoto === true ? true : null,
		statuses: params.statuses,
	});
}

export function toAuthorListCallInput(
	params: AuthorsListingSearchParams,
): Partial<AuthorListInput> {
	return {
		...toFilterInput(params),
		sortBy: params.sortBy ?? "bookCount",
		sortDirection: params.sortDirection ?? "desc",
		limit: AUTHORS_PAGE_SIZE,
	} as Partial<AuthorListInput>;
}

/** The facet counts follow every filter except the nationality picked itself. */
export function toAuthorNationalityFacetsInput(
	params: AuthorsListingSearchParams,
): Partial<AuthorNationalityFacetsInput> {
	const { countries: _selected, ...rest } = toFilterInput(params);
	return buildListCallInput({
		...rest,
		pinnedCountryCodes: normalizeCountryCodes(params.countries),
	}) as Partial<AuthorNationalityFacetsInput>;
}

export function countAuthorSheetFilters(
	params: AuthorsListingSearchParams,
): number {
	let count = 0;
	if (params.minBooks != null) count += 1;
	if (params.minReaders != null) count += 1;
	if (params.minReads != null) count += 1;
	if (params.minReviews != null) count += 1;
	if (params.minPages != null || params.maxPages != null) count += 1;
	if (params.minRating != null || params.maxRating != null) count += 1;
	if (params.countries && params.countries.length > 0) count += 1;
	if (params.genders && params.genders.length > 0) count += 1;
	if (params.hasPhoto === true) count += 1;
	if (params.statuses && params.statuses.length > 0) count += 1;
	return count;
}

export function clearAuthorSheetFilters(
	setParams: ReturnType<typeof useAuthorsListingSearchParams>[1],
) {
	void setParams({
		minBooks: null,
		minReaders: null,
		minReads: null,
		minReviews: null,
		minPages: null,
		maxPages: null,
		minRating: null,
		maxRating: null,
		countries: null,
		genders: null,
		hasPhoto: null,
		statuses: null,
	});
}
