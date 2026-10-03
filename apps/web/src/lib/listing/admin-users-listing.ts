import { adminUserSortableFields } from "@bbrc/api/modules/admin/admin-user.listing";
import type { ListAdminUsersInput } from "@bbrc/api/modules/admin/admin-user.schema";
import {
	parseAsArrayOf,
	parseAsInteger,
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
import { userStatuses } from "@/lib/listing/users-listing";

export const adminUserSortByLabels = {
	createdAt: "Joined",
	name: "Name",
	username: "Username",
	xp: "XP",
	rp: "RP",
	"posts._count": "Posts",
	"comments._count": "Comments",
	"likes._count": "Likes",
	"feedbacks._count": "Feedbacks",
	"participations._count": "Sittings",
	"favorites._count": "Favorites",
	"shelves._count": "Shelves",
} as const satisfies FieldLabels<(typeof adminUserSortableFields)[number]>;

export const adminUserListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	limit: parseAsInteger.withDefault(20).withOptions({ shallow: false }),
	sortBy: createSortByParser(adminUserSortableFields).withOptions({
		shallow: false,
	}),
	sortDirection: sortDirectionParser.withOptions({ shallow: false }),
	rangeBy: createRangeByParser(["createdAt"] as const).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(parseAsStringLiteral(userStatuses)).withOptions({
		shallow: false,
	}),
	isAdmin: booleanFilterParser.withOptions({ shallow: false }),
	minXp: parseAsInteger.withOptions({ shallow: false }),
	minRp: parseAsInteger.withOptions({ shallow: false }),
	minPosts: parseAsInteger.withOptions({ shallow: false }),
	minComments: parseAsInteger.withOptions({ shallow: false }),
	minLikes: parseAsInteger.withOptions({ shallow: false }),
	minFeedbacks: parseAsInteger.withOptions({ shallow: false }),
	minParticipations: parseAsInteger.withOptions({ shallow: false }),
	minFavorites: parseAsInteger.withOptions({ shallow: false }),
	minShelves: parseAsInteger.withOptions({ shallow: false }),
};

export function useAdminUsersListingSearchParams() {
	return useQueryStates(adminUserListingSearchParams, { shallow: false });
}

export type AdminUsersListingSearchParams = ReturnType<
	typeof useAdminUsersListingSearchParams
>[0];

export function toAdminUsersListCallInput(
	params: AdminUsersListingSearchParams,
): ListAdminUsersInput {
	return buildListCallInput({
		search: params.search,
		page: params.page,
		limit: params.limit,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		isAdmin: params.isAdmin,
		minXp: params.minXp,
		minRp: params.minRp,
		minPosts: params.minPosts,
		minComments: params.minComments,
		minLikes: params.minLikes,
		minFeedbacks: params.minFeedbacks,
		minParticipations: params.minParticipations,
		minFavorites: params.minFavorites,
		minShelves: params.minShelves,
	}) as ListAdminUsersInput;
}
