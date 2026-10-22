import {
	sittingListSortableFields,
	sittingRangeableFields,
	sittingStatusFilterLabels,
} from "@bbrc/api/modules/sitting/sitting.listing";
import type { GetSittingListInput } from "@bbrc/api/modules/sitting/sitting.schema";
import { SittingStatusSchema } from "@bbrc/schemas";
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
	booleanFilterParser,
	createRangeByParser,
	createSortByParser,
	rangeMaxParser,
	rangeMinParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export const sittingStatuses = SittingStatusSchema.options;

export type SittingListingStatus = (typeof sittingStatuses)[number];

export const sittingSortByLabels = {
	createdAt: "Start date",
	updatedAt: "Last updated",
	deadline: "Deadline",
	status: "Status",
	"participants._count": "Participants",
	completedCount: "Completed readers",
} as const satisfies FieldLabels<(typeof sittingListSortableFields)[number]>;

export const sittingRangeByLabels = {
	createdAt: "Start date",
	updatedAt: "Last updated",
	deadline: "Deadline",
} as const satisfies FieldLabels<(typeof sittingRangeableFields)[number]>;

export { sittingStatusFilterLabels };

const urlOptions = { shallow: false } as const;

export const sittingListingSearchParams = {
	search: searchParser.withOptions({ ...urlOptions, throttleMs: 400 }),
	sortBy: createSortByParser(sittingListSortableFields)
		.withDefault("createdAt")
		.withOptions(urlOptions),
	sortDirection: sortDirectionParser
		.withDefault("desc")
		.withOptions(urlOptions),
	rangeBy: createRangeByParser(sittingRangeableFields).withOptions(urlOptions),
	rangeMin: rangeMinParser.withOptions(urlOptions),
	rangeMax: rangeMaxParser.withOptions(urlOptions),
	statuses: parseAsArrayOf(parseAsStringLiteral(sittingStatuses)).withOptions(
		urlOptions,
	),
	ongoingOnly: booleanFilterParser.withOptions(urlOptions),
	minParticipants: parseAsInteger.withOptions(urlOptions),
	maxParticipants: parseAsInteger.withOptions(urlOptions),
	minCompleted: parseAsInteger.withOptions(urlOptions),
	maxCompleted: parseAsInteger.withOptions(urlOptions),
	minPages: parseAsInteger.withOptions(urlOptions),
	maxPages: parseAsInteger.withOptions(urlOptions),
	mineOnly: parseAsBoolean.withDefault(false).withOptions(urlOptions),
};

export function useSittingListingSearchParams() {
	return useQueryStates(sittingListingSearchParams, { shallow: false });
}

export type SittingListingSearchParams = ReturnType<
	typeof useSittingListingSearchParams
>[0];

export function toSittingListCallInput(
	params: SittingListingSearchParams,
): Partial<GetSittingListInput> {
	return buildListCallInput({
		search: params.search,
		sortBy: params.sortBy ?? "createdAt",
		sortDirection: params.sortDirection ?? "desc",
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		ongoingOnly: params.ongoingOnly,
		minParticipants: params.minParticipants,
		maxParticipants: params.maxParticipants,
		minCompleted: params.minCompleted,
		maxCompleted: params.maxCompleted,
		minPages: params.minPages,
		maxPages: params.maxPages,
		mineOnly: params.mineOnly ? true : undefined,
		limit: 12,
	}) as Partial<GetSittingListInput>;
}

export function countSittingSheetFilters(
	params: SittingListingSearchParams,
): number {
	let count = 0;
	if (params.statuses && params.statuses.length > 0) count += 1;
	if (params.minParticipants != null || params.maxParticipants != null) {
		count += 1;
	}
	if (params.minCompleted != null || params.maxCompleted != null) count += 1;
	if (params.minPages != null || params.maxPages != null) count += 1;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (params.mineOnly) count += 1;
	return count;
}

/** True when any search or filter narrows the list (sorting does not count). */
export function hasActiveSittingFilters(
	params: SittingListingSearchParams,
): boolean {
	return (
		Boolean(params.search?.trim()) ||
		Boolean(params.ongoingOnly) ||
		countSittingSheetFilters(params) > 0
	);
}

export function clearSittingSheetFilters(
	setParams: ReturnType<typeof useSittingListingSearchParams>[1],
) {
	void setParams({
		statuses: null,
		ongoingOnly: null,
		minParticipants: null,
		maxParticipants: null,
		minCompleted: null,
		maxCompleted: null,
		minPages: null,
		maxPages: null,
		rangeBy: null,
		rangeMin: null,
		rangeMax: null,
		mineOnly: null,
	});
}
