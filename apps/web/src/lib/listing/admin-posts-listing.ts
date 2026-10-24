import {
	adminPostSortableFields,
	postAttachmentKindValues,
} from "@bbrc/api/modules/admin/admin-post.listing";
import type {
	GetAdminPostOverviewInput,
	ListAdminPostsInput,
} from "@bbrc/api/modules/admin/admin-post.schema";
import { postRangeableFields } from "@bbrc/api/modules/post/post.listing";
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

export { postAttachmentKindValues };

export const adminPostAttachmentKindLabels = {
	book: "Book",
	shelf: "Shelf",
	sitting: "Sitting",
	user: "Member",
	feedback: "Feedback",
	post: "Post",
	comment: "Comment",
	author: "Author",
} as const satisfies Record<(typeof postAttachmentKindValues)[number], string>;

export const adminPostSortByLabels = {
	createdAt: "Posted",
	updatedAt: "Updated",
	editedAt: "Edited",
	"likes._count": "Likes",
	"comments._count": "Comments",
} as const satisfies FieldLabels<(typeof adminPostSortableFields)[number]>;

export const adminPostRangeByLabels = {
	createdAt: "Posted",
	updatedAt: "Updated",
	editedAt: "Edited",
} as const satisfies FieldLabels<(typeof postRangeableFields)[number]>;

export const adminPostsListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	limit: parseAsInteger.withDefault(20).withOptions({ shallow: false }),
	sortBy: createSortByParser(adminPostSortableFields)
		.withDefault("createdAt")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser.withDefault("desc").withOptions({
		shallow: false,
	}),
	rangeBy: createRangeByParser(postRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	authorUsernames: parseAsArrayOf(parseAsString).withOptions({
		shallow: false,
	}),
	hasAttachedBook: booleanFilterParser.withOptions({ shallow: false }),
	hasImage: booleanFilterParser.withOptions({ shallow: false }),
	hasAttachment: booleanFilterParser.withOptions({ shallow: false }),
	attachmentKinds: parseAsArrayOf(
		parseAsStringLiteral(postAttachmentKindValues),
	).withOptions({ shallow: false }),
	minLikes: parseAsInteger.withOptions({ shallow: false }),
	minComments: parseAsInteger.withOptions({ shallow: false }),
	wasEdited: booleanFilterParser.withOptions({ shallow: false }),
	minContentLength: parseAsInteger.withOptions({ shallow: false }),
};

export function useAdminPostsListingSearchParams() {
	return useQueryStates(adminPostsListingSearchParams, { shallow: false });
}

export type AdminPostsListingSearchParams = ReturnType<
	typeof useAdminPostsListingSearchParams
>[0];

function buildAdminPostFilterCallInput(params: AdminPostsListingSearchParams) {
	return buildListCallInput({
		search: params.search,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		authorUsernames: params.authorUsernames,
		hasAttachedBook: params.hasAttachedBook,
		hasImage: params.hasImage,
		hasAttachment: params.hasAttachment,
		attachmentKinds: params.attachmentKinds,
		minLikes: params.minLikes,
		minComments: params.minComments,
		wasEdited: params.wasEdited,
		minContentLength: params.minContentLength,
	});
}

export function toAdminPostsOverviewCallInput(
	params: AdminPostsListingSearchParams,
): GetAdminPostOverviewInput {
	return buildAdminPostFilterCallInput(params) as GetAdminPostOverviewInput;
}

export function toAdminPostsListCallInput(
	params: AdminPostsListingSearchParams,
): ListAdminPostsInput {
	return {
		...buildAdminPostFilterCallInput(params),
		page: params.page,
		limit: params.limit,
		sortBy: params.sortBy ?? "createdAt",
		sortDirection: params.sortDirection ?? "desc",
	} as ListAdminPostsInput;
}
