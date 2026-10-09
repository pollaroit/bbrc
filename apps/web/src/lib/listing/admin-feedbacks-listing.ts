import { adminFeedbackSortableFields } from "@bbrc/api/modules/admin/admin-feedback.listing";
import type {
	GetAdminFeedbackOverviewInput,
	ListAdminFeedbacksInput,
} from "@bbrc/api/modules/admin/admin-feedback.schema";
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
	createRangeByParser,
	createSortByParser,
	rangeMaxParser,
	rangeMinParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export const adminFeedbackSortByLabels = {
	createdAt: "Submitted",
	updatedAt: "Updated",
	rating: "Rating",
	"likes._count": "Likes",
	"comments._count": "Comments",
	"postAttachments._count": "Post attachments",
	"book.averageRating": "Book club rating",
	"book.pages": "Book pages",
} as const satisfies FieldLabels<(typeof adminFeedbackSortableFields)[number]>;

export const adminFeedbackRangeByLabels = {
	createdAt: "Submitted",
	updatedAt: "Updated",
} as const;

export const adminFeedbacksListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	limit: parseAsInteger.withDefault(20).withOptions({ shallow: false }),
	sortBy: createSortByParser(adminFeedbackSortableFields)
		.withDefault("createdAt")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser.withDefault("desc").withOptions({
		shallow: false,
	}),
	rangeBy: createRangeByParser(["createdAt", "updatedAt"] as const).withOptions(
		{ shallow: false },
	),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	minRating: parseAsFloat.withOptions({ shallow: false }),
	maxRating: parseAsFloat.withOptions({ shallow: false }),
	minLikes: parseAsInteger.withOptions({ shallow: false }),
	minComments: parseAsInteger.withOptions({ shallow: false }),
	minPostAttachments: parseAsInteger.withOptions({ shallow: false }),
	minReviewLength: parseAsInteger.withOptions({ shallow: false }),
	minBookPages: parseAsInteger.withOptions({ shallow: false }),
	maxBookPages: parseAsInteger.withOptions({ shallow: false }),
	bookSlugs: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	authorUsernames: parseAsArrayOf(parseAsString).withOptions({
		shallow: false,
	}),
};

export function useAdminFeedbacksListingSearchParams() {
	return useQueryStates(adminFeedbacksListingSearchParams, { shallow: false });
}

export type AdminFeedbacksListingSearchParams = ReturnType<
	typeof useAdminFeedbacksListingSearchParams
>[0];

function buildAdminFeedbackFilterCallInput(
	params: AdminFeedbacksListingSearchParams,
) {
	return buildListCallInput({
		search: params.search,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		minRating: params.minRating,
		maxRating: params.maxRating,
		minLikes: params.minLikes,
		minComments: params.minComments,
		minPostAttachments: params.minPostAttachments,
		minReviewLength: params.minReviewLength,
		minBookPages: params.minBookPages,
		maxBookPages: params.maxBookPages,
		bookSlugs: params.bookSlugs,
		authorUsernames: params.authorUsernames,
	});
}

export function toAdminFeedbacksOverviewCallInput(
	params: AdminFeedbacksListingSearchParams,
): GetAdminFeedbackOverviewInput {
	return buildAdminFeedbackFilterCallInput(
		params,
	) as GetAdminFeedbackOverviewInput;
}

export function toAdminFeedbacksListCallInput(
	params: AdminFeedbacksListingSearchParams,
): ListAdminFeedbacksInput {
	return {
		...buildAdminFeedbackFilterCallInput(params),
		page: params.page,
		limit: params.limit,
		sortBy: params.sortBy ?? "createdAt",
		sortDirection: params.sortDirection ?? "desc",
	} as ListAdminFeedbacksInput;
}
