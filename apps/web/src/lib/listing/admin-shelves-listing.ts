import { adminShelfSortableFields } from "@bbrc/api/modules/admin/admin-shelf.listing";
import type {
	GetAdminShelfOverviewInput,
	ListAdminShelvesInput,
} from "@bbrc/api/modules/admin/admin-shelf.schema";
import {
	shelfRangeableFields,
	shelfTypeFilterLabels,
	shelfTypes,
} from "@bbrc/api/modules/shelf/shelf.listing";
import { ShelfStatusSchema } from "@bbrc/api/modules/shelf/shelf.schema";
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

export const adminShelfStatuses = ShelfStatusSchema.options;

export const adminShelfStatusFilterLabels = {
	draft: "Draft",
	active: "Public",
	archived: "Archived",
} as const satisfies Record<(typeof adminShelfStatuses)[number], string>;

export { shelfTypeFilterLabels, shelfTypes };

export const adminShelfSortByLabels = {
	createdAt: "Created",
	updatedAt: "Updated",
	title: "Title",
	"books._count": "Books",
	"collaborators._count": "Collaborators",
	"postAttachments._count": "Post attachments",
	"user.username": "Owner username",
} as const satisfies FieldLabels<(typeof adminShelfSortableFields)[number]>;

export const adminShelfRangeByLabels = {
	createdAt: "Created",
	updatedAt: "Updated",
} as const satisfies FieldLabels<(typeof shelfRangeableFields)[number]>;

export const adminShelvesListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	limit: parseAsInteger.withDefault(20).withOptions({ shallow: false }),
	sortBy: createSortByParser(adminShelfSortableFields)
		.withDefault("updatedAt")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser.withDefault("desc").withOptions({
		shallow: false,
	}),
	rangeBy: createRangeByParser(shelfRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(
		parseAsStringLiteral(adminShelfStatuses),
	).withOptions({ shallow: false }),
	types: parseAsArrayOf(parseAsStringLiteral(shelfTypes)).withOptions({
		shallow: false,
	}),
	minBooks: parseAsInteger.withOptions({ shallow: false }),
	ownerUsernames: parseAsArrayOf(parseAsString).withOptions({
		shallow: false,
	}),
	hasCoverImage: booleanFilterParser.withOptions({ shallow: false }),
	minPostAttachments: parseAsInteger.withOptions({ shallow: false }),
};

export function useAdminShelvesListingSearchParams() {
	return useQueryStates(adminShelvesListingSearchParams, { shallow: false });
}

export type AdminShelvesListingSearchParams = ReturnType<
	typeof useAdminShelvesListingSearchParams
>[0];

function buildAdminShelfFilterCallInput(
	params: AdminShelvesListingSearchParams,
) {
	return buildListCallInput({
		search: params.search,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		types: params.types,
		minBooks: params.minBooks,
		ownerUsernames: params.ownerUsernames,
		hasCoverImage: params.hasCoverImage,
		minPostAttachments: params.minPostAttachments,
	});
}

export function toAdminShelvesOverviewCallInput(
	params: AdminShelvesListingSearchParams,
): GetAdminShelfOverviewInput {
	return buildAdminShelfFilterCallInput(params) as GetAdminShelfOverviewInput;
}

export function toAdminShelvesListCallInput(
	params: AdminShelvesListingSearchParams,
): ListAdminShelvesInput {
	return {
		...buildAdminShelfFilterCallInput(params),
		page: params.page,
		limit: params.limit,
		sortBy: params.sortBy ?? "updatedAt",
		sortDirection: params.sortDirection ?? "desc",
	} as ListAdminShelvesInput;
}
