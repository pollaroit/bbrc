"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";
import { orpc } from "@/utils/orpc";

const CELL =
	"flex min-w-0 flex-col gap-0.5 border border-border bg-card px-3 py-2";

/**
 * "Reading now" and "On wishlists" as two more cells for the book header's
 * stats grid (so the Overview shows them next to Published, Pages and the
 * ratings). Counts only, never names. Reading links to the readers page.
 */
export function BookReadingStatCells({ bookSlug }: { bookSlug: string }) {
	const counts = useQuery({
		...orpc.reading.counts.queryOptions({ input: { bookSlug } }),
		staleTime: 60_000,
	});
	const reading = counts.data?.readingNow;
	const wished = counts.data?.onWishlists;

	const readingBody = (
		<>
			<span className="text-muted-foreground text-xs">Reading now</span>
			<span className="font-medium tabular-nums leading-tight">
				{reading ?? "—"}
			</span>
		</>
	);

	return (
		<>
			{reading ? (
				<Link
					href={`/books/${bookSlug}/reading` as Route}
					className={`${CELL} transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
				>
					{readingBody}
				</Link>
			) : (
				<div className={CELL}>{readingBody}</div>
			)}
			<div className={CELL}>
				<span className="text-muted-foreground text-xs">On wishlists</span>
				<span className="font-medium tabular-nums leading-tight">
					{wished ?? "—"}
				</span>
			</div>
		</>
	);
}
