import {
	ADMIN_AUTHOR_SORT_FIELDS,
	type AdminAuthorSortField,
} from "@bbrc/api/modules/author-admin/author-dashboard.helpers";
import type {
	AdminAuthorListInput,
	AdminAuthorScopeInput,
} from "@bbrc/api/modules/author-admin/author-dashboard.schema";
import { type AUTHOR_FIELDS, bookCountryCodeSchema } from "@bbrc/shared";
import {
	parseAsArrayOf,
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

export const adminAuthorStatuses = [
	"verified",
	"auto",
	"needs_review",
] as const;
export const adminAuthorEnrichmentStatuses = [
	"pending",
	"running",
	"done",
	"failed",
] as const;
export const adminAuthorSources = [
	"openlibrary",
	"wikidata",
	"wikipedia",
	"ai",
	"admin",
] as const;
export const adminAuthorGenders = [
	"female",
	"male",
	"non_binary",
	"other",
	"unknown",
] as const;
export const adminAuthorRangeByOptions = [
	"createdAt",
	"updatedAt",
	"enrichedAt",
] as const;

export const adminAuthorStatusLabels = {
	verified: "Confirmed",
	auto: "Filled in automatically",
	needs_review: "Needs review",
} as const satisfies FieldLabels<(typeof adminAuthorStatuses)[number]>;

export const adminAuthorEnrichmentLabels = {
	pending: "Waiting for lookup",
	running: "Looking up now",
	done: "Looked up",
	failed: "Lookup failed",
} as const satisfies FieldLabels<
	(typeof adminAuthorEnrichmentStatuses)[number]
>;

export const adminAuthorSourceLabels = {
	openlibrary: "Open Library",
	wikidata: "Wikidata",
	wikipedia: "Wikipedia",
	ai: "AI-assisted",
	admin: "Added by an admin",
} as const satisfies FieldLabels<(typeof adminAuthorSources)[number]>;

export const adminAuthorGenderLabels = {
	female: "Female",
	male: "Male",
	non_binary: "Non-binary",
	other: "Other",
	unknown: "Not known",
} as const satisfies FieldLabels<(typeof adminAuthorGenders)[number]>;

export const adminAuthorRangeByLabels = {
	createdAt: "Added",
	updatedAt: "Updated",
	enrichedAt: "Looked up",
} as const satisfies FieldLabels<(typeof adminAuthorRangeByOptions)[number]>;

export const adminAuthorFieldLabels = {
	name: "Name",
	sortName: "Sort name",
	bio: "Bio",
	birth: "Birth date",
	death: "Death date",
	birthPlace: "Birthplace",
	deathPlace: "Place of death",
	nationalities: "Nationality",
	gender: "Gender",
	wikipediaUrl: "Wikipedia link",
	goodreadsUrl: "Goodreads link",
	websiteUrl: "Website",
	photo: "Photo",
} as const satisfies FieldLabels<(typeof AUTHOR_FIELDS)[number]>;

/** The fields worth asking "which authors are missing this?" about. */
export const adminAuthorMissingFieldOptions = [
	"bio",
	"photo",
	"birth",
	"birthPlace",
	"nationalities",
	"gender",
	"wikipediaUrl",
	"goodreadsUrl",
] as const satisfies readonly (typeof AUTHOR_FIELDS)[number][];

export const adminAuthorSortByLabels = {
	name: "Name",
	createdAt: "Added",
	updatedAt: "Updated",
	enrichedAt: "Looked up",
	status: "Status",
	bookCount: "Books",
	readerCount: "Readers",
	readCount: "Reads",
	followerCount: "Followers",
	birthYear: "Born",
} as const satisfies FieldLabels<AdminAuthorSortField>;

export { ADMIN_AUTHOR_SORT_FIELDS as adminAuthorSortableFields };

export const adminAuthorsListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	limit: parseAsInteger.withDefault(20).withOptions({ shallow: false }),
	sortBy: createSortByParser(ADMIN_AUTHOR_SORT_FIELDS).withOptions({
		shallow: false,
	}),
	sortDirection: sortDirectionParser.withOptions({ shallow: false }),
	rangeBy: createRangeByParser(adminAuthorRangeByOptions).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(
		parseAsStringLiteral(adminAuthorStatuses),
	).withOptions({ shallow: false }),
	enrichmentStatuses: parseAsArrayOf(
		parseAsStringLiteral(adminAuthorEnrichmentStatuses),
	).withOptions({ shallow: false }),
	nationalities: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	genders: parseAsArrayOf(parseAsStringLiteral(adminAuthorGenders)).withOptions(
		{
			shallow: false,
		},
	),
	sources: parseAsArrayOf(parseAsStringLiteral(adminAuthorSources)).withOptions(
		{
			shallow: false,
		},
	),
	missingFields: parseAsArrayOf(
		parseAsStringLiteral(adminAuthorMissingFieldOptions),
	).withOptions({ shallow: false }),
	hasPhoto: booleanFilterParser.withOptions({ shallow: false }),
	hasBio: booleanFilterParser.withOptions({ shallow: false }),
	hasLocks: booleanFilterParser.withOptions({ shallow: false }),
	withoutBooks: booleanFilterParser.withOptions({ shallow: false }),
	minBooks: parseAsInteger.withOptions({ shallow: false }),
	maxBooks: parseAsInteger.withOptions({ shallow: false }),
	minReaders: parseAsInteger.withOptions({ shallow: false }),
	minFollowers: parseAsInteger.withOptions({ shallow: false }),
};

export function useAdminAuthorsListingSearchParams() {
	return useQueryStates(adminAuthorsListingSearchParams, { shallow: false });
}

export type AdminAuthorsListingSearchParams = ReturnType<
	typeof useAdminAuthorsListingSearchParams
>[0];

function normalizeNationalities(
	codes: string[] | null | undefined,
): string[] | undefined {
	if (!codes || codes.length === 0) {
		return undefined;
	}
	const valid = codes.flatMap((code) => {
		const parsed = bookCountryCodeSchema.safeParse(code);
		return parsed.success ? [parsed.data] : [];
	});
	return valid.length > 0 ? valid : undefined;
}

function buildFilterCallInput(params: AdminAuthorsListingSearchParams) {
	return {
		search: params.search,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		enrichmentStatuses: params.enrichmentStatuses,
		nationalities: normalizeNationalities(params.nationalities),
		genders: params.genders,
		sources: params.sources,
		missingFields: params.missingFields,
		hasPhoto: params.hasPhoto,
		hasBio: params.hasBio,
		hasLocks: params.hasLocks,
		withoutBooks: params.withoutBooks,
		minBooks: params.minBooks,
		maxBooks: params.maxBooks,
		minReaders: params.minReaders,
		minFollowers: params.minFollowers,
	};
}

/** Input shared by the overview and the stats (filters, range and search; no sorting or paging). */
export function toAdminAuthorsScopeCallInput(
	params: AdminAuthorsListingSearchParams,
): AdminAuthorScopeInput {
	return buildListCallInput(
		buildFilterCallInput(params),
	) as AdminAuthorScopeInput;
}

export function toAdminAuthorsListCallInput(
	params: AdminAuthorsListingSearchParams,
): AdminAuthorListInput {
	return buildListCallInput({
		...buildFilterCallInput(params),
		page: params.page,
		limit: params.limit,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
	}) as AdminAuthorListInput;
}

/** How many filter groups the filters sheet has switched on (the search box is not one). */
export function countAdminAuthorFilters(
	params: AdminAuthorsListingSearchParams,
): number {
	let count = 0;
	if (params.statuses?.length) count += 1;
	if (params.enrichmentStatuses?.length) count += 1;
	if (params.nationalities?.length) count += 1;
	if (params.genders?.length) count += 1;
	if (params.sources?.length) count += 1;
	if (params.missingFields?.length) count += 1;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (params.hasPhoto != null || params.hasBio != null) count += 1;
	if (params.hasLocks != null) count += 1;
	if (params.withoutBooks != null) count += 1;
	if (
		params.minBooks != null ||
		params.maxBooks != null ||
		params.minReaders != null ||
		params.minFollowers != null
	) {
		count += 1;
	}
	return count;
}

/** Reset values for every filter, for the sheet's "Clear" button. */
export const clearedAdminAuthorFilters = {
	statuses: null,
	enrichmentStatuses: null,
	nationalities: null,
	genders: null,
	sources: null,
	missingFields: null,
	rangeBy: null,
	rangeMin: null,
	rangeMax: null,
	hasPhoto: null,
	hasBio: null,
	hasLocks: null,
	withoutBooks: null,
	minBooks: null,
	maxBooks: null,
	minReaders: null,
	minFollowers: null,
} as const;
