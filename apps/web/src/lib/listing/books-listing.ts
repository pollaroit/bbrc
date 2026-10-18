import {
	bookRangeableFields,
	bookSortableFields,
} from "@bbrc/api/modules/book/book.listing";
import type {
	GetBookListAuthorFacetsInput,
	GetBookListCountryFacetsInput,
	GetBookListInput,
} from "@bbrc/api/modules/book/book.schema";
import {
	bookCountryCodeSchema,
	isAuthorSlug,
	isSubjectSlug,
} from "@bbrc/shared";
import {
	parseAsArrayOf,
	parseAsFloat,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";
import type { FieldLabels } from "@/lib/listing/labels";
import {
	booleanFilterParser,
	createRangeByParser,
	createSortByParser,
	rangeMaxParser,
	rangeMinParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export const bookStatuses = ["completed", "reading", "wishlist"] as const;

export const viewerReadFilterValues = ["read", "unread"] as const;

export const subjectMatchValues = ["any", "all"] as const;

export type SubjectMatchMode = (typeof subjectMatchValues)[number];

export type ViewerReadFilter = (typeof viewerReadFilterValues)[number];

export type BookListingStatus = (typeof bookStatuses)[number];

export const bookSortByLabels = {
	createdAt: "Date added",
	updatedAt: "Last updated",
	title: "Title",
	status: "Reading status",
	pages: "Page count",
	averageRating: "Club rating",
	openLibraryRating: "Open Library rating",
	publishedIn: "Publication year",
	"feedbacks._count": "Reviews",
	"favorites._count": "Favorites",
	"reads._count": "Member reads",
	"shelves._count": "Shelf placements",
	"documents._count": "Documents",
} as const satisfies FieldLabels<(typeof bookSortableFields)[number]>;

export const bookRangeByLabels = {
	createdAt: "Date added",
	updatedAt: "Last updated",
} as const satisfies FieldLabels<(typeof bookRangeableFields)[number]>;

export const bookStatusFilterLabels = {
	completed: "Completed",
	reading: "Reading",
	wishlist: "Wishlist",
} as const satisfies FieldLabels<BookListingStatus>;

export const bookListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	sortBy: createSortByParser(bookSortableFields).withOptions({
		shallow: false,
	}),
	sortDirection: sortDirectionParser.withOptions({ shallow: false }),
	rangeBy: createRangeByParser(bookRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(parseAsStringLiteral(bookStatuses)).withOptions({
		shallow: false,
	}),
	minOpenLibraryRating: parseAsFloat.withOptions({ shallow: false }),
	maxOpenLibraryRating: parseAsFloat.withOptions({ shallow: false }),
	minPages: parseAsInteger.withOptions({ shallow: false }),
	maxPages: parseAsInteger.withOptions({ shallow: false }),
	minPublishedIn: parseAsInteger.withOptions({ shallow: false }),
	maxPublishedIn: parseAsInteger.withOptions({ shallow: false }),
	minReads: parseAsInteger.withOptions({ shallow: false }),
	maxReads: parseAsInteger.withOptions({ shallow: false }),
	authors: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	subjects: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	subjectsMatch: parseAsStringLiteral(subjectMatchValues).withOptions({
		shallow: false,
	}),
	countries: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	viewerRead: parseAsStringLiteral(viewerReadFilterValues).withOptions({
		shallow: false,
	}),
	viewerFavorite: booleanFilterParser.withOptions({ shallow: false }),
	viewerReviewed: booleanFilterParser.withOptions({ shallow: false }),
};

export const viewerBookFilterLabels = {
	viewerRead: "Read",
	viewerFavorite: "Favorite",
	viewerReviewed: "Reviewed",
} as const;

export function useBookListingSearchParams() {
	return useQueryStates(bookListingSearchParams, { shallow: false });
}

export type BookListingSearchParams = ReturnType<
	typeof useBookListingSearchParams
>[0];

export function normalizeAuthorSlugs(
	authors: string[] | null | undefined,
): string[] | undefined {
	if (!authors || authors.length === 0) {
		return undefined;
	}

	const slugs = authors.filter(isAuthorSlug);
	return slugs.length > 0 ? slugs : undefined;
}

export function normalizeSubjectSlugs(
	subjects: string[] | null | undefined,
): string[] | undefined {
	if (!subjects || subjects.length === 0) {
		return undefined;
	}

	const slugs = subjects.filter(isSubjectSlug);
	return slugs.length > 0 ? slugs : undefined;
}

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

export function toBookListCallInput(
	params: BookListingSearchParams,
): Partial<GetBookListInput> {
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
		minPublishedIn: params.minPublishedIn,
		maxPublishedIn: params.maxPublishedIn,
		minReads: params.minReads,
		maxReads: params.maxReads,
		authors: normalizeAuthorSlugs(params.authors),
		subjects: normalizeSubjectSlugs(params.subjects),
		subjectsMatch:
			params.subjects && params.subjects.length > 1
				? (params.subjectsMatch ?? "any")
				: undefined,
		countries: normalizeCountryCodes(params.countries),
		viewerRead: params.viewerRead ?? undefined,
		viewerFavorite: params.viewerFavorite === true ? true : undefined,
		viewerReviewed: params.viewerReviewed === true ? true : undefined,
		limit: 24,
	}) as Partial<GetBookListInput>;
}

/** Catalog filters shared by list + facet queries (no pagination). */
export function toBookListCatalogFilterInput(
	params: BookListingSearchParams,
): Partial<GetBookListInput> {
	const listInput = toBookListCallInput(params);
	const { limit: _limit, cursor: _cursor, ...rest } = listInput;
	return rest;
}

export function toBookListAuthorFacetsInput(
	params: BookListingSearchParams,
): Partial<GetBookListAuthorFacetsInput> {
	const catalog = toBookListCatalogFilterInput(params);
	const {
		authors: _selectedAuthors,
		countries: _countries,
		...catalogWithoutPeople
	} = catalog;

	return buildListCallInput({
		...catalogWithoutPeople,
		pinnedAuthorSlugs: normalizeAuthorSlugs(params.authors),
	}) as Partial<GetBookListAuthorFacetsInput>;
}

export function toBookListCountryFacetsInput(
	params: BookListingSearchParams,
): Partial<GetBookListCountryFacetsInput> {
	const catalog = toBookListCatalogFilterInput(params);
	const { countries: _selectedCountries, ...catalogWithoutCountries } = catalog;

	return buildListCallInput({
		...catalogWithoutCountries,
		authors: normalizeAuthorSlugs(params.authors),
		pinnedCountryCodes: normalizeCountryCodes(params.countries),
	}) as Partial<GetBookListCountryFacetsInput>;
}

export function toBookExportCallInput(
	params: BookListingSearchParams,
): Partial<GetBookListInput> {
	const listInput = toBookListCallInput(params);
	const { limit: _limit, ...rest } = listInput;
	return rest;
}

export function countBookSheetFilters(params: BookListingSearchParams): number {
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

	if (params.minPublishedIn != null || params.maxPublishedIn != null) {
		count += 1;
	}

	if (params.minReads != null || params.maxReads != null) {
		count += 1;
	}

	if (params.authors && params.authors.length > 0) {
		count += 1;
	}

	if (params.subjects && params.subjects.length > 0) {
		count += 1;
	}

	if (params.subjectsMatch === "all") {
		count += 1;
	}

	if (params.countries && params.countries.length > 0) {
		count += 1;
	}

	if (params.rangeMin != null || params.rangeMax != null) {
		count += 1;
	}

	if (params.viewerRead != null) {
		count += 1;
	}

	if (params.viewerFavorite === true) {
		count += 1;
	}

	if (params.viewerReviewed === true) {
		count += 1;
	}

	return count;
}

export function clearBookSheetFilters(
	setParams: ReturnType<typeof useBookListingSearchParams>[1],
) {
	void setParams({
		statuses: null,
		minOpenLibraryRating: null,
		maxOpenLibraryRating: null,
		minPages: null,
		maxPages: null,
		minPublishedIn: null,
		maxPublishedIn: null,
		minReads: null,
		maxReads: null,
		authors: null,
		subjects: null,
		subjectsMatch: null,
		countries: null,
		rangeBy: null,
		rangeMin: null,
		rangeMax: null,
		viewerRead: null,
		viewerFavorite: null,
		viewerReviewed: null,
	});
}
