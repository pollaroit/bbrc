import { adminSeriesSortableFields } from "@bbrc/api/modules/admin/admin-series.listing";
import type {
	GetAdminSeriesOverviewInput,
	ListAdminSeriesInput,
} from "@bbrc/api/modules/admin/admin-series.schema";
import { seriesRangeableFields } from "@bbrc/api/modules/series/series.listing";
import { parseAsInteger, useQueryStates } from "nuqs";
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

export const adminSeriesSortByLabels = {
	createdAt: "Created",
	updatedAt: "Updated",
	title: "Title",
	"books._count": "Books",
} as const satisfies FieldLabels<(typeof adminSeriesSortableFields)[number]>;

export const adminSeriesRangeByLabels = {
	createdAt: "Created",
	updatedAt: "Updated",
} as const satisfies FieldLabels<(typeof seriesRangeableFields)[number]>;

export const adminSeriesListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	limit: parseAsInteger.withDefault(20).withOptions({ shallow: false }),
	sortBy: createSortByParser(adminSeriesSortableFields)
		.withDefault("updatedAt")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser.withDefault("desc").withOptions({
		shallow: false,
	}),
	rangeBy: createRangeByParser(seriesRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	minBooks: parseAsInteger.withOptions({ shallow: false }),
	hasDescription: booleanFilterParser.withOptions({ shallow: false }),
};

export function useAdminSeriesListingSearchParams() {
	return useQueryStates(adminSeriesListingSearchParams, { shallow: false });
}

export type AdminSeriesListingSearchParams = ReturnType<
	typeof useAdminSeriesListingSearchParams
>[0];

function buildAdminSeriesFilterCallInput(
	params: AdminSeriesListingSearchParams,
) {
	return buildListCallInput({
		search: params.search,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		minBooks: params.minBooks,
		hasDescription: params.hasDescription,
	});
}

export function toAdminSeriesOverviewCallInput(
	params: AdminSeriesListingSearchParams,
): GetAdminSeriesOverviewInput {
	return buildAdminSeriesFilterCallInput(params) as GetAdminSeriesOverviewInput;
}

export function toAdminSeriesListCallInput(
	params: AdminSeriesListingSearchParams,
): ListAdminSeriesInput {
	return {
		...buildAdminSeriesFilterCallInput(params),
		page: params.page,
		limit: params.limit,
		sortBy: params.sortBy ?? "updatedAt",
		sortDirection: params.sortDirection ?? "desc",
	} as ListAdminSeriesInput;
}
