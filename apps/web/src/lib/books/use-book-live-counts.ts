"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

/**
 * The numbers on a book page that move while people read: reads, readers now,
 * wishlists and favorites. One place asks, so the header tiles and the tab
 * counts share the same queries (and every mutation that refreshes them).
 */
export function useBookLiveCounts(slug: string) {
	const reads = useQuery(
		orpc.read.listForBook.queryOptions({
			input: { bookSlug: slug, limit: 1 },
		}),
	);
	const reading = useQuery({
		...orpc.reading.counts.queryOptions({ input: { bookSlug: slug } }),
		staleTime: 60_000,
	});
	const favorites = useQuery(
		orpc.favorite.listForBook.queryOptions({
			input: { bookSlug: slug, limit: 1 },
		}),
	);

	return {
		reads: reads.data?.total,
		reading: reading.data?.readingNow,
		wishlists: reading.data?.onWishlists,
		favorites: favorites.data?.total,
	};
}
