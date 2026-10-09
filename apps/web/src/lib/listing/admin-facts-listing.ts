import { adminFactSortableFields } from "@bbrc/api/modules/admin/admin-fact.listing";
import type { ListAdminFactsInput } from "@bbrc/api/modules/admin/admin-fact.schema";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";
import type { FieldLabels } from "@/lib/listing/labels";
import { createSortByParser, sortDirectionParser } from "@/lib/listing/parsers";

export const adminFactSortByLabels = {
	createdAt: "Created",
	upvoteCount: "Upvotes",
	downvoteCount: "Downvotes",
	impressionCount: "Impressions",
} as const satisfies FieldLabels<(typeof adminFactSortableFields)[number]>;

export const adminFactsListingSearchParams = {
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	status: parseAsStringLiteral(["all", "draft", "published"] as const)
		.withDefault("all")
		.withOptions({ shallow: false }),
	sortBy: createSortByParser(adminFactSortableFields)
		.withDefault("createdAt")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser
		.withDefault("desc")
		.withOptions({ shallow: false }),
};

export function useAdminFactsListingSearchParams() {
	return useQueryStates(adminFactsListingSearchParams, { shallow: false });
}

export function buildAdminFactsListInput(
	params: ReturnType<typeof useAdminFactsListingSearchParams>[0],
): ListAdminFactsInput {
	return buildListCallInput({
		page: params.page,
		limit: 10,
		status: params.status,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
	}) as ListAdminFactsInput;
}
