import {
	userRangeableFields,
	userSortableFields,
} from "@bbrc/api/modules/user/user.listing";
import type { GetUserListInput } from "@bbrc/api/modules/user/user.schema";
import { parseAsArrayOf, parseAsStringLiteral, useQueryStates } from "nuqs";
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

export const userStatuses = ["active", "warned", "banned"] as const;

export type UserListingStatus = (typeof userStatuses)[number];

export const userSortByLabels = {
	createdAt: "Join date",
	name: "Name",
	xp: "Experience",
	rp: "Reading points",
	"participations._count": "Participations",
	"feedbacks._count": "Feedbacks",
	"posts._count": "Posts",
} as const satisfies FieldLabels<(typeof userSortableFields)[number]>;

export const userRangeByLabels = {
	createdAt: "Join date",
} as const satisfies FieldLabels<(typeof userRangeableFields)[number]>;

export const userStatusFilterLabels = {
	active: "Active",
	warned: "Warned",
	banned: "Banned",
} as const satisfies FieldLabels<UserListingStatus>;

export const userListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	sortBy: createSortByParser(userSortableFields).withOptions({
		shallow: false,
	}),
	sortDirection: sortDirectionParser.withOptions({ shallow: false }),
	rangeBy: createRangeByParser(userRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(parseAsStringLiteral(userStatuses)).withOptions({
		shallow: false,
	}),
	isAdmin: booleanFilterParser.withOptions({ shallow: false }),
};

export function useUserListingSearchParams() {
	return useQueryStates(userListingSearchParams, { shallow: false });
}

export type UserListingSearchParams = ReturnType<
	typeof useUserListingSearchParams
>[0];

export function toUserListCallInput(
	params: UserListingSearchParams,
): Partial<GetUserListInput> {
	return buildListCallInput({
		search: params.search,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		isAdmin: params.isAdmin,
	}) as Partial<GetUserListInput>;
}

export function countUserSheetFilters(params: UserListingSearchParams): number {
	let count = 0;

	if (params.statuses && params.statuses.length > 0) {
		count += 1;
	}

	if (params.isAdmin != null) {
		count += 1;
	}

	if (params.rangeMin != null || params.rangeMax != null) {
		count += 1;
	}

	return count;
}

export function clearUserSheetFilters(
	setParams: ReturnType<typeof useUserListingSearchParams>[1],
) {
	void setParams({
		statuses: null,
		isAdmin: null,
		rangeBy: null,
		rangeMin: null,
		rangeMax: null,
	});
}
