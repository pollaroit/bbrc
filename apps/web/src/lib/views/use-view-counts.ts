"use client";

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { isPendingSlug } from "@/lib/optimistic/infinite-lists";
import { orpc } from "@/utils/orpc";

const CHUNK = 50;

/**
 * Public view counts for posts or books, by slug. A long list is asked for in
 * chunks of 50, and a chunk that is already loaded is never asked for again
 * when more pages are added.
 */
export function useViewCounts(resource: "post" | "book", refs: string[]) {
	const chunks = useMemo(() => {
		const unique = [...new Set(refs)].filter((ref) => !isPendingSlug(ref));
		const out: string[][] = [];
		for (let index = 0; index < unique.length; index += CHUNK) {
			out.push(unique.slice(index, index + CHUNK));
		}
		return out;
	}, [refs]);

	return useQueries({
		queries: chunks.map((chunk) =>
			orpc.view.counts.queryOptions({
				input: { resource, refs: chunk },
				staleTime: 60_000,
			}),
		),
		combine: (results) => {
			const counts: Record<string, number> = {};
			for (const result of results) {
				Object.assign(counts, result.data?.counts);
			}
			return counts;
		},
	});
}
