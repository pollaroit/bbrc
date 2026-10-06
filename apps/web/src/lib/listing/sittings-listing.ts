import {
	sittingRangeableFields,
	sittingSortableFields,
	sittingStatusFilterLabels,
} from "@bbrc/api/modules/sitting/sitting.listing";
import type { GetSittingListInput } from "@bbrc/api/modules/sitting/sitting.schema";
import { SittingStatusSchema } from "@bbrc/schemas";
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

export const sittingStatuses = SittingStatusSchema.options;

export type SittingListingStatus = (typeof sittingStatuses)[number];

export const sittingSortByLabels = {
	createdAt: "Date created",
	updatedAt: "Last updated",
	deadline: "Deadline",
	status: "Status",
	"participants._count": "Participants",
} as const satisfies FieldLabels<(typeof sittingSortableFields)[number]>;

export const sittingRangeByLabels = {
	createdAt: "Date created",
	updatedAt: "Last updated",
	deadline: "Deadline",
} as const satisfies FieldLabels<(typeof sittingRangeableFields)[number]>;

export { sittingStatusFilterLabels };

export const sittingListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	sortBy: createSortByParser(sittingSortableFields)
		.withDefault("createdAt")
		.withOptions({
			shallow: false,
		}),
	sortDirection: sortDirectionParser.withDefault("desc").withOptions({
		shallow: false,
	}),
	rangeBy: createRangeByParser(sittingRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(parseAsStringLiteral(sittingStatuses)).withOptions({
		shallow: false,
	}),
	ongoingOnly: booleanFilterParser.withOptions({ shallow: false }),
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
		limit: 24,
	}) as Partial<GetSittingListInput>;
}

export function countSittingSheetFilters(
	params: SittingListingSearchParams,
): number {
	if (params.statuses && params.statuses.length > 0) {
		return 1;
	}

	return 0;
}

export function clearSittingSheetFilters(
	setParams: ReturnType<typeof useSittingListingSearchParams>[1],
) {
	void setParams({
		statuses: null,
	});
}
