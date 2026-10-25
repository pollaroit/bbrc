import { adminBookSortableFields } from "@bbrc/api/modules/admin/admin-book.listing";
import type {
	GetAdminBookOverviewInput,
	ListAdminBooksInput,
} from "@bbrc/api/modules/admin/admin-book.schema";
import type { GetBookListCountryFacetsInput } from "@bbrc/api/modules/book/book.schema";
import { bookCountryCodeSchema } from "@bbrc/shared";
import {
	parseAsArrayOf,
	parseAsFloat,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { bookStatuses } from "@/lib/listing/books-listing";
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

export const adminBookSortByLabels = {
	createdAt: "Added",
	updatedAt: "Updated",
	title: "Title",
	status: "Status",
	pages: "Pages",
	averageRating: "Club rating",
	openLibraryRating: "OL rating",
	publishedIn: "Published",
	"feedbacks._count": "Feedbacks",
	"favorites._count": "Favorites",
	"reads._count": "Reads",
	"shelves._count": "Shelf adds",
	"documents._count": "Documents",
	viewCount: "Views",
	viewerCount: "Viewers",
	readingNowCount: "Reading now",
	wishlistCount: "Wishlisted",
	"postAttachments._count": "Post attachments",
	"polls._count": "Poll options",
	pollVotes: "Poll votes",
} as const satisfies FieldLabels<(typeof adminBookSortableFields)[number]>;

const adminBookMinCountParams = {
	minFeedbacks: parseAsInteger.withOptions({ shallow: false }),
	minFavorites: parseAsInteger.withOptions({ shallow: false }),
	minPostAttachments: parseAsInteger.withOptions({ shallow: false }),
	minPollOptions: parseAsInteger.withOptions({ shallow: false }),
	minPollVotes: parseAsInteger.withOptions({ shallow: false }),
	minReads: parseAsInteger.withOptions({ shallow: false }),
	maxReads: parseAsInteger.withOptions({ shallow: false }),
} as const;

export const adminBooksListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	limit: parseAsInteger.withDefault(20).withOptions({ shallow: false }),
	sortBy: createSortByParser(adminBookSortableFields).withOptions({
		shallow: false,
	}),
	sortDirection: sortDirectionParser.withOptions({ shallow: false }),
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
	minAverageRating: parseAsFloat.withOptions({ shallow: false }),
	maxAverageRating: parseAsFloat.withOptions({ shallow: false }),
	minPages: parseAsInteger.withOptions({ shallow: false }),
	maxPages: parseAsInteger.withOptions({ shallow: false }),
	missingClubRating: booleanFilterParser.withOptions({ shallow: false }),
	missingOpenLibraryRating: booleanFilterParser.withOptions({ shallow: false }),
	countries: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	...adminBookMinCountParams,
};

function normalizeCountryCodes(
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

export function useAdminBooksListingSearchParams() {
	return useQueryStates(adminBooksListingSearchParams, { shallow: false });
}

export type AdminBooksListingSearchParams = ReturnType<
	typeof useAdminBooksListingSearchParams
>[0];

function buildAdminBookFilterCallInput(params: AdminBooksListingSearchParams) {
	return {
		search: params.search,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		minOpenLibraryRating: params.minOpenLibraryRating,
		maxOpenLibraryRating: params.maxOpenLibraryRating,
		minAverageRating: params.minAverageRating,
		maxAverageRating: params.maxAverageRating,
		minPages: params.minPages,
		maxPages: params.maxPages,
		missingClubRating: params.missingClubRating,
		missingOpenLibraryRating: params.missingOpenLibraryRating,
		minFeedbacks: params.minFeedbacks,
		minFavorites: params.minFavorites,
		minPostAttachments: params.minPostAttachments,
		minPollOptions: params.minPollOptions,
		minPollVotes: params.minPollVotes,
		minReads: params.minReads,
		maxReads: params.maxReads,
		countries: normalizeCountryCodes(params.countries),
	};
}

export function toAdminBooksCountryFacetsInput(
	params: AdminBooksListingSearchParams,
): Partial<GetBookListCountryFacetsInput> {
	const overview = toAdminBooksOverviewCallInput(params);
	const { countries: _selected, ...rest } = overview;

	return buildListCallInput({
		...rest,
		pinnedCountryCodes: normalizeCountryCodes(params.countries),
	}) as Partial<GetBookListCountryFacetsInput>;
}

export function toAdminBooksOverviewCallInput(
	params: AdminBooksListingSearchParams,
): GetAdminBookOverviewInput {
	return buildListCallInput(
		buildAdminBookFilterCallInput(params),
	) as GetAdminBookOverviewInput;
}

export function toAdminBooksListCallInput(
	params: AdminBooksListingSearchParams,
): ListAdminBooksInput {
	return buildListCallInput({
		...buildAdminBookFilterCallInput(params),
		page: params.page,
		limit: params.limit,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
	}) as ListAdminBooksInput;
}
