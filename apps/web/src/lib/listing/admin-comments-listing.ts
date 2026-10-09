import {
	adminCommentContextValues,
	adminCommentSortableFields,
} from "@bbrc/api/modules/admin/admin-comment.listing";
import type {
	GetAdminCommentOverviewInput,
	ListAdminCommentsInput,
} from "@bbrc/api/modules/admin/admin-comment.schema";
import { commentRangeableFields } from "@bbrc/api/modules/comment/comment.listing";
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
	createStringLiteralArrayParser,
	rangeMaxParser,
	rangeMinParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export { adminCommentContextValues };

export const adminCommentContextLabels = {
	post: "On posts",
	feedback: "On feedbacks",
} as const satisfies Record<(typeof adminCommentContextValues)[number], string>;

export const adminCommentDepthOptions = [0, 1, 2, 3, 4] as const;

export const adminCommentSortByLabels = {
	createdAt: "Posted",
	updatedAt: "Updated",
	editedAt: "Edited",
	"likes._count": "Likes",
	"replies._count": "Replies",
} as const satisfies FieldLabels<(typeof adminCommentSortableFields)[number]>;

export const adminCommentRangeByLabels = {
	createdAt: "Posted",
	updatedAt: "Updated",
	editedAt: "Edited",
} as const satisfies FieldLabels<(typeof commentRangeableFields)[number]>;

export const adminCommentsListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	limit: parseAsInteger.withDefault(20).withOptions({ shallow: false }),
	sortBy: createSortByParser(adminCommentSortableFields)
		.withDefault("createdAt")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser.withDefault("desc").withOptions({
		shallow: false,
	}),
	rangeBy: createRangeByParser(commentRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	contexts: createStringLiteralArrayParser(
		adminCommentContextValues,
	).withOptions({ shallow: false }),
	postSlugs: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	feedbackSlugs: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	authorUsernames: parseAsArrayOf(parseAsString).withOptions({
		shallow: false,
	}),
	isReply: booleanFilterParser.withOptions({ shallow: false }),
	depths: parseAsArrayOf(parseAsInteger).withOptions({ shallow: false }),
	hasImage: booleanFilterParser.withOptions({ shallow: false }),
	wasEdited: booleanFilterParser.withOptions({ shallow: false }),
	minLikes: parseAsInteger.withOptions({ shallow: false }),
	minReplies: parseAsInteger.withOptions({ shallow: false }),
	minContentLength: parseAsInteger.withOptions({ shallow: false }),
};

export function useAdminCommentsListingSearchParams() {
	return useQueryStates(adminCommentsListingSearchParams, { shallow: false });
}

export type AdminCommentsListingSearchParams = ReturnType<
	typeof useAdminCommentsListingSearchParams
>[0];

function buildAdminCommentFilterCallInput(
	params: AdminCommentsListingSearchParams,
) {
	return buildListCallInput({
		search: params.search,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		contexts: params.contexts,
		postSlugs: params.postSlugs,
		feedbackSlugs: params.feedbackSlugs,
		authorUsernames: params.authorUsernames,
		isReply: params.isReply,
		depths: params.depths,
		hasImage: params.hasImage,
		wasEdited: params.wasEdited,
		minLikes: params.minLikes,
		minReplies: params.minReplies,
		minContentLength: params.minContentLength,
	});
}

export function toAdminCommentsOverviewCallInput(
	params: AdminCommentsListingSearchParams,
): GetAdminCommentOverviewInput {
	return buildAdminCommentFilterCallInput(
		params,
	) as GetAdminCommentOverviewInput;
}

export function toAdminCommentsListCallInput(
	params: AdminCommentsListingSearchParams,
): ListAdminCommentsInput {
	return {
		...buildAdminCommentFilterCallInput(params),
		page: params.page,
		limit: params.limit,
		sortBy: params.sortBy ?? "createdAt",
		sortDirection: params.sortDirection ?? "desc",
	} as ListAdminCommentsInput;
}
