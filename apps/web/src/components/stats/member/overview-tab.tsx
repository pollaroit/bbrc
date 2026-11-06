"use client";

import type { MemberStatsOverviewOutput } from "@bbrc/api/modules/member-stats/member-stats.schema";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import {
	singleYearOf,
	useReadsHref,
	useStatsLinkPeriod,
} from "@/lib/stats/use-reads-href";
import { CoverLink } from "../cover-link";
import { HistogramChart } from "../stats-charts";
import { StatsEmpty, StatsSection } from "../stats-kit";

type OverviewBook = MemberStatsOverviewOutput["booksRead"]["books"][number];

/** Overview: the finished books as covers, and when they were finished. The header and scoreboard sit above the tabs. */
export function OverviewTab({
	data,
	username,
}: {
	data: MemberStatsOverviewOutput;
	username: string;
}) {
	const extra = data.booksRead.total - data.booksRead.books.length;
	const readsHref = useReadsHref(username);
	const year = singleYearOf(useStatsLinkPeriod());
	const monthIndex = (label: string) =>
		[
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
		].indexOf(label) + 1;
	return (
		<div className="flex flex-col gap-4">
			{data.access.reads ? (
				<StatsSection
					id="books-read"
					title="Books read"
					description={`${data.booksRead.total} ${data.booksRead.total === 1 ? "book" : "books"}, most recently finished first.`}
				>
					{data.booksRead.books.length === 0 ? (
						<StatsEmpty>No books finished in this period.</StatsEmpty>
					) : (
						<ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
							{data.booksRead.books.map((book) => (
								<li key={book.id}>
									<CoverLink
										book={book}
										detail={book.finished ? `Finished ${book.finished}` : null}
									/>
								</li>
							))}
							{data.booksRead.hasMore ? (
								<li>
									<Link
										href={`/users/${username}/reads` as Route}
										className="flex aspect-2/3 flex-col items-center justify-center gap-0.5 border border-border border-dashed text-center text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground"
									>
										<span className="font-semibold text-base tabular-nums">
											+{extra}
										</span>
										all reads
									</Link>
								</li>
							) : null}
						</ul>
					)}
				</StatsSection>
			) : null}

			{data.access.reads && data.readsOverTime.mode !== "hidden" ? (
				<StatsSection
					id="reads-over-time"
					title="Reads over time"
					description={
						data.readsOverTime.mode === "month"
							? "Books finished each month."
							: "Books finished each year."
					}
				>
					<HistogramChart
						points={data.readsOverTime.points}
						hrefFor={(label) =>
							data.readsOverTime.mode === "month"
								? year && monthIndex(label) > 0
									? readsHref({
											kind: "finished",
											year,
											month: monthIndex(label),
										})
									: null
								: readsHref({ kind: "finished", year: Number(label) })
						}
					/>
				</StatsSection>
			) : null}
		</div>
	);
}
