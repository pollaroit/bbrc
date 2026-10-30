import type { ListFriendsInput } from "@bbrc/api/modules/friend/friend.schema";
import { parseAsBoolean, useQueryStates } from "nuqs";
import { searchParser } from "@/lib/listing/parsers";

export const FRIENDS_PAGE_SIZE = 24;

export const friendsListingSearchParams = {
	search: searchParser.withOptions({ shallow: true, throttleMs: 400 }),
	mutual: parseAsBoolean.withDefault(false),
};

export function useFriendsListingSearchParams() {
	return useQueryStates(friendsListingSearchParams);
}

export type FriendsListingSearchParams = ReturnType<
	typeof useFriendsListingSearchParams
>[0];

export function toFriendsListCallInput(
	params: FriendsListingSearchParams,
	username?: string,
): Partial<ListFriendsInput> {
	return {
		limit: FRIENDS_PAGE_SIZE,
		...(username ? { username } : {}),
		...(params.search?.trim() ? { search: params.search.trim() } : {}),
		...(params.mutual ? { mutualOnly: true } : {}),
	};
}
