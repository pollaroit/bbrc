import { seriesSortableFields } from "@bbrc/api/modules/series/series.listing";
import type { GetSeriesListInput } from "@bbrc/api/modules/series/series.schema";
import { useQueryStates } from "nuqs";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";
import type { FieldLabels } from "@/lib/listing/labels";
import {
	createSortByParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export const seriesSortByLabels = {
	createdAt: "Date created",
	updatedAt: "Last updated",
	title: "Title",
	"books._count": "Book count",
} as const satisfies FieldLabels<(typeof seriesSortableFields)[number]>;

export const seriesListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	sortBy: createSortByParser(seriesSortableFields).withOptions({
		shallow: false,
	}),
	sortDirection: sortDirectionParser.withOptions({ shallow: false }),
};

export function useSeriesListingSearchParams() {
	return useQueryStates(seriesListingSearchParams, { shallow: false });
}

export type SeriesListingSearchParams = ReturnType<
	typeof useSeriesListingSearchParams
>[0];

export function toSeriesListCallInput(
	params: SeriesListingSearchParams,
): Partial<GetSeriesListInput> {
	return buildListCallInput({
		search: params.search,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
		limit: 24,
	}) as Partial<GetSeriesListInput>;
}
