import type { ListShelvesByUsernameOutput } from "@bbrc/api/modules/shelf/shelf.schema";
import {
	parseAsArrayOf,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import type { FieldLabels } from "@/lib/listing/labels";
import { sortDirectionParser } from "@/lib/listing/parsers";

type ShelfItem = ListShelvesByUsernameOutput["items"][number];

export const userShelfSortFields = ["updatedAt", "title", "bookCount"] as const;
export const userShelfTypes = ["ordered", "unordered"] as const;

export type UserShelfSortField = (typeof userShelfSortFields)[number];
export type UserShelfType = (typeof userShelfTypes)[number];

export const userShelfSortByLabels = {
	updatedAt: "Last updated",
	title: "Title",
	bookCount: "Book count",
} as const satisfies FieldLabels<UserShelfSortField>;

export const userShelfTypeLabels = {
	ordered: "Ranked",
	unordered: "List",
} as const satisfies Record<UserShelfType, string>;

export const userShelfRoles = ["all", "owned", "shared"] as const;
export type UserShelfRole = (typeof userShelfRoles)[number];

export const userShelfListingParams = {
	role: parseAsStringLiteral(userShelfRoles).withDefault("all"),
	search: parseAsString,
	sortBy: parseAsStringLiteral(userShelfSortFields).withDefault("updatedAt"),
	sortDirection: sortDirectionParser.withDefault("desc"),
	types: parseAsArrayOf(parseAsStringLiteral(userShelfTypes)),
};

export function useUserShelfListingParams() {
	return useQueryStates(userShelfListingParams);
}

export type UserShelfListingParams = ReturnType<
	typeof useUserShelfListingParams
>[0];

export function hasActiveUserShelfFilters(params: UserShelfListingParams) {
	return (
		Boolean(params.search?.trim()) ||
		Boolean(params.types && params.types.length > 0) ||
		params.role !== "all"
	);
}

/** Shelves are few per member, so search, filter and sort run in the browser. */
export function filterAndSortShelves(
	items: ShelfItem[],
	params: UserShelfListingParams,
): ShelfItem[] {
	const query = params.search?.trim().toLowerCase();
	const sign = params.sortDirection === "asc" ? 1 : -1;

	return items
		.filter((shelf) => {
			if (params.role === "owned" && shelf.role !== "owner") {
				return false;
			}
			if (params.role === "shared" && shelf.role !== "collaborator") {
				return false;
			}
			if (params.types?.length && !params.types.includes(shelf.type)) {
				return false;
			}
			if (query) {
				const haystack =
					`${shelf.title} ${shelf.description ?? ""}`.toLowerCase();
				return haystack.includes(query);
			}
			return true;
		})
		.toSorted((a, b) => {
			switch (params.sortBy) {
				case "title":
					return sign * a.title.localeCompare(b.title);
				case "bookCount":
					return sign * (a.bookCount - b.bookCount);
				default:
					return sign * (a.updatedAt.getTime() - b.updatedAt.getTime());
			}
		});
}
