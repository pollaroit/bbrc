import type { ListAdminFactsInput } from "@bbrc/api/modules/admin/admin-fact.schema";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";

export const adminFactsListingSearchParams = {
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	status: parseAsStringLiteral(["all", "draft", "published"] as const)
		.withDefault("all")
		.withOptions({ shallow: false }),
};

export function useAdminFactsListingSearchParams() {
	return useQueryStates(adminFactsListingSearchParams, { shallow: false });
}

export function buildAdminFactsListInput(
	params: ReturnType<typeof useAdminFactsListingSearchParams>[0],
): ListAdminFactsInput {
	return {
		page: params.page,
		limit: 10,
		status: params.status,
	};
}
