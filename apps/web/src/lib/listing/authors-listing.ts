import { authorSortableFields } from "@bbrc/api/modules/author/author.listing";
import type {
	GetAuthorListCountryFacetsInput,
	GetAuthorListInput,
} from "@bbrc/api/modules/author/author.schema";
import { bookCountryCodeSchema } from "@bbrc/shared";
import {
	parseAsArrayOf,
	parseAsFloat,
	parseAsInteger,
	parseAsString,
	useQueryStates,
} from "nuqs";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";
import type { FieldLabels } from "@/lib/listing/labels";
import {
	createSortByParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export const authorSortByLabels = {
	name: "Name",
	bookCount: "Book count",
	readerCount: "Reader count",
	averageRating: "Average rating",
} as const satisfies FieldLabels<(typeof authorSortableFields)[number]>;

export const authorsListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	sortBy: createSortByParser(authorSortableFields).withOptions({
		shallow: false,
	}),
	sortDirection: sortDirectionParser.withOptions({ shallow: false }),
	minBooks: parseAsInteger.withOptions({ shallow: false }),
	maxBooks: parseAsInteger.withOptions({ shallow: false }),
	minReads: parseAsInteger.withOptions({ shallow: false }),
	maxReads: parseAsInteger.withOptions({ shallow: false }),
	minAverageRating: parseAsFloat.withOptions({ shallow: false }),
	maxAverageRating: parseAsFloat.withOptions({ shallow: false }),
	countries: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
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

export function toAuthorListCallInput(
	params: AuthorsListingSearchParams,
): Partial<GetAuthorListInput> {
	return buildListCallInput({
		search: params.search,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
		minBooks: params.minBooks,
		maxBooks: params.maxBooks,
		minReads: params.minReads,
		maxReads: params.maxReads,
		minAverageRating: params.minAverageRating,
		maxAverageRating: params.maxAverageRating,
		countries: normalizeCountryCodes(params.countries),
		limit: 24,
	}) as Partial<GetAuthorListInput>;
}

export function toAuthorListCatalogFilterInput(
	params: AuthorsListingSearchParams,
): Partial<GetAuthorListInput> {
	const listInput = toAuthorListCallInput(params);
	const { limit: _limit, cursor: _cursor, ...rest } = listInput;
	return rest;
}

export function toAuthorListCountryFacetsInput(
	params: AuthorsListingSearchParams,
): Partial<GetAuthorListCountryFacetsInput> {
	const catalog = toAuthorListCatalogFilterInput(params);
	const { countries: _selectedCountries, ...catalogWithoutCountries } = catalog;

	return buildListCallInput({
		...catalogWithoutCountries,
		pinnedCountryCodes: normalizeCountryCodes(params.countries),
	}) as Partial<GetAuthorListCountryFacetsInput>;
}

export function countAuthorSheetFilters(
	params: AuthorsListingSearchParams,
): number {
	let count = 0;

	if (params.minBooks != null || params.maxBooks != null) {
		count += 1;
	}

	if (params.minReads != null || params.maxReads != null) {
		count += 1;
	}

	if (params.minAverageRating != null || params.maxAverageRating != null) {
		count += 1;
	}

	if (params.countries && params.countries.length > 0) {
		count += 1;
	}

	return count;
}

export function clearAuthorSheetFilters(
	setParams: ReturnType<typeof useAuthorsListingSearchParams>[1],
) {
	void setParams({
		minBooks: null,
		maxBooks: null,
		minReads: null,
		maxReads: null,
		minAverageRating: null,
		maxAverageRating: null,
		countries: null,
	});
}
