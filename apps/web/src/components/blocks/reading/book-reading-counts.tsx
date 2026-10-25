"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

/*
 * "N reading now" and "N on wishlists" for the About page. Counts only: it
 * never says who, and wishlists that are private are counted too.
 *
 * <BookReadingCounts bookSlug />
 */

export function BookReadingCounts({ bookSlug }: { bookSlug: string }) {
	const counts = useQuery({
		...orpc.reading.counts.queryOptions({ input: { bookSlug } }),
		staleTime: 60_000,
	});

	const cells = [
		{ label: "Reading now", value: counts.data?.readingNow },
		{ label: "On wishlists", value: counts.data?.onWishlists },
	];

	return (
		<>
			{cells.map((cell) => (
				<Card key={cell.label} size="sm">
					<CardHeader>
						<CardTitle>{cell.label}</CardTitle>
					</CardHeader>
					<CardContent>
						{cell.value == null ? (
							<Skeleton className="h-6 w-10" aria-hidden />
						) : (
							<p className="font-medium text-lg tabular-nums">{cell.value}</p>
						)}
					</CardContent>
				</Card>
			))}
		</>
	);
}
