"use client";

import type { AuthorGetOutput } from "@bbrc/api/modules/author/author.schema";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

/**
 * The author pages are cached for everyone, so what depends on who is looking (admin tools,
 * "you have read 3 of 8") comes from one signed-in query that every part of the page shares.
 */
export function useAuthorViewer(slug: string): AuthorGetOutput | undefined {
	const { data: session } = authClient.useSession();
	const query = useQuery({
		...orpc.author.get.queryOptions({ input: { slug } }),
		enabled: Boolean(session?.user),
		staleTime: 60_000,
	});

	return query.data;
}
