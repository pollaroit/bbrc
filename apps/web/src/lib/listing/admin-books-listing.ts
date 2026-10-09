import { adminBookSortableFields } from "@bbrc/api/modules/admin/admin-book.listing";
import type {
	GetAdminBookOverviewInput,
	ListAdminBooksInput,
} from "@bbrc/api/modules/admin/admin-book.schema";
import {
	parseAsArrayOf,
	parseAsFloat,
	parseAsInteger,
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
	pages: "Pages",
	averageRating: "Club rating",
	openLibraryRating: "OL rating",
	publishedIn: "Published",
	"feedbacks._count": "Feedbacks",
	"favorites._count": "Favorites",
	"shelfBooks._count": "Shelf adds",
	"postAttachments._count": "Post attachments",
	"polls._count": "Poll options",
	pollVotes: "Poll votes",
	"reads._count": "Reads",
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
	...adminBookMinCountParams,
};

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
	};
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
