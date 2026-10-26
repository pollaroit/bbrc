"use client";

import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

/** The member's own wording for ratings, by rating key. Empty when signed out or nothing is edited. */
export function useRatingDefinitions() {
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);
	const query = useQuery({
		...orpc.ratingDefinition.listMine.queryOptions(),
		enabled: signedIn,
		staleTime: 5 * 60_000,
	});
	return {
		signedIn,
		overrides: query.data?.overrides ?? {},
		queryKey: orpc.ratingDefinition.listMine.queryKey(),
		isPending: signedIn && query.isPending,
	};
}
