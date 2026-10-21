import type { GetUserParticipationListInput } from "@bbrc/api/modules/user/user.schema";
import {
	userParticipationRangeableFields,
	userParticipationSortableFields,
} from "@bbrc/api/modules/user/user-participation.listing";
import { ProgressSchema, SittingStatusSchema } from "@bbrc/schemas";
import {
	parseAsArrayOf,
	parseAsBoolean,
	parseAsInteger,
	parseAsStringLiteral,
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

export const userSittingStatuses = SittingStatusSchema.options;
export const userSittingProgresses = ProgressSchema.options;

export type UserSittingStatus = (typeof userSittingStatuses)[number];
export type UserSittingProgress = (typeof userSittingProgresses)[number];

export const userSittingSortByLabels = {
	updatedAt: "Last activity",
	startedAt: "Start date",
	deadline: "Deadline",
	status: "Sitting status",
	participants: "Participants",
} as const satisfies FieldLabels<
	(typeof userParticipationSortableFields)[number]
>;

export const userSittingRangeByLabels = {
	startedAt: "Start date",
	deadline: "Deadline",
} as const satisfies FieldLabels<
	(typeof userParticipationRangeableFields)[number]
>;

export const userSittingStatusLabels = {
	voting: "Voting",
	reading: "Reading",
	finished: "Finished",
} as const satisfies Record<UserSittingStatus, string>;

export const userSittingProgressLabels = {
	not_started: "Not started",
	in_progress: "Reading",
	completed: "Completed",
	dnf: "Did not finish",
} as const satisfies Record<UserSittingProgress, string>;

export const userSittingListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	sortBy: createSortByParser(userParticipationSortableFields)
		.withDefault("updatedAt")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser
		.withDefault("desc")
		.withOptions({ shallow: false }),
	rangeBy: createRangeByParser(userParticipationRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(
		parseAsStringLiteral(userSittingStatuses),
	).withOptions({ shallow: false }),
	progresses: parseAsArrayOf(
		parseAsStringLiteral(userSittingProgresses),
	).withOptions({ shallow: false }),
	minParticipants: parseAsInteger.withOptions({ shallow: false }),
	maxParticipants: parseAsInteger.withOptions({ shallow: false }),
	mutualOnly: parseAsBoolean.withDefault(false).withOptions({ shallow: false }),
};

export function useUserSittingListingSearchParams() {
	return useQueryStates(userSittingListingSearchParams, { shallow: false });
}

export type UserSittingListingSearchParams = ReturnType<
	typeof useUserSittingListingSearchParams
>[0];

export function toUserSittingListCallInput(
	params: UserSittingListingSearchParams,
): Partial<GetUserParticipationListInput> {
	return buildListCallInput({
		search: params.search,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		progresses: params.progresses,
		minParticipants: params.minParticipants,
		maxParticipants: params.maxParticipants,
		mutualOnly: params.mutualOnly ? true : undefined,
		limit: 10,
	}) as Partial<GetUserParticipationListInput>;
}

/** True when any search or filter narrows the list (sorting does not count). */
export function hasActiveUserSittingFilters(
	params: UserSittingListingSearchParams,
): boolean {
	return (
		Boolean(params.search?.trim()) || countUserSittingSheetFilters(params) > 0
	);
}

export function countUserSittingSheetFilters(
	params: UserSittingListingSearchParams,
): number {
	let count = 0;
	if (params.statuses && params.statuses.length > 0) count += 1;
	if (params.progresses && params.progresses.length > 0) count += 1;
	if (params.minParticipants != null || params.maxParticipants != null) {
		count += 1;
	}
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (params.mutualOnly) count += 1;
	return count;
}

export function clearUserSittingSheetFilters(
	setParams: ReturnType<typeof useUserSittingListingSearchParams>[1],
) {
	void setParams({
		statuses: null,
		progresses: null,
		minParticipants: null,
		maxParticipants: null,
		rangeBy: null,
		rangeMin: null,
		rangeMax: null,
		mutualOnly: null,
	});
}
