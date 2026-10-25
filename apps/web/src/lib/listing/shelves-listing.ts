import {
	shelfCollabFilterLabels,
	shelfCollabFilters,
	shelfRangeableFields,
	shelfSortableFields,
	shelfTypeFilterLabels,
	shelfTypes,
} from "@bbrc/api/modules/shelf/shelf.listing";
import type { GetShelfListInput } from "@bbrc/api/modules/shelf/shelf.schema";
import {
	parseAsArrayOf,
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

export const shelfSortByLabels = {
	createdAt: "Date created",
	updatedAt: "Last updated",
	title: "Title",
	"books._count": "Book count",
	"collaborators._count": "Collaborators",
	viewCount: "Views",
	viewerCount: "Viewers",
} as const satisfies FieldLabels<(typeof shelfSortableFields)[number]>;

export const shelfRangeByLabels = {
	createdAt: "Date created",
	updatedAt: "Last updated",
} as const satisfies FieldLabels<(typeof shelfRangeableFields)[number]>;

export { shelfCollabFilterLabels, shelfCollabFilters, shelfTypeFilterLabels };

export const shelvesListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	sortBy: createSortByParser(shelfSortableFields).withOptions({
		shallow: false,
	}),
	sortDirection: sortDirectionParser.withOptions({ shallow: false }),
	rangeBy: createRangeByParser(shelfRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	types: parseAsArrayOf(parseAsStringLiteral(shelfTypes)).withOptions({
		shallow: false,
	}),
	minBooks: parseAsInteger.withOptions({ shallow: false }),
	collab: parseAsStringLiteral(shelfCollabFilters).withOptions({
		shallow: false,
	}),
};

export function useShelvesListingSearchParams() {
	return useQueryStates(shelvesListingSearchParams, { shallow: false });
}

export type ShelvesListingSearchParams = ReturnType<
	typeof useShelvesListingSearchParams
>[0];

export function toShelfListCallInput(
	params: ShelvesListingSearchParams,
): Partial<GetShelfListInput> {
	return buildListCallInput({
		search: params.search,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		types: params.types,
		collab: params.collab ?? undefined,
		minBooks: params.minBooks ?? undefined,
		limit: 24,
	}) as Partial<GetShelfListInput>;
}

export function countShelvesSheetFilters(
	params: ShelvesListingSearchParams,
): number {
	let count = 0;

	if (params.types && params.types.length > 0) {
		count += 1;
	}

	if (params.minBooks != null && params.minBooks > 0) {
		count += 1;
	}

	if (params.collab != null) {
		count += 1;
	}

	if (
		params.rangeBy != null &&
		(params.rangeMin != null || params.rangeMax != null)
	) {
		count += 1;
	}

	return count;
}

export function clearShelvesSheetFilters(
	setParams: ReturnType<typeof useShelvesListingSearchParams>[1],
) {
	void setParams({
		types: null,
		collab: null,
		minBooks: null,
		rangeBy: null,
		rangeMin: null,
		rangeMax: null,
	});
}
