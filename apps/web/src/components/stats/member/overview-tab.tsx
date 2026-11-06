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
import { HistogramChart } from "../stats-charts";
import { StatsEmpty, StatsSection } from "../stats-kit";

type OverviewBook = MemberStatsOverviewOutput["booksRead"]["books"][number];

function CoverTile({ book }: { book: OverviewBook }) {
	const src = bookCoverUrl(book.coverId, "M");
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Link
						href={`/books/${book.slug}` as Route}
						className="relative block aspect-2/3 overflow-hidden border border-border bg-muted outline-offset-2 transition-transform hover:z-10 hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-ring"
					/>
				}
			>
				{src ? (
					<Image
						src={src}
						alt={book.title}
						fill
						sizes="(max-width: 640px) 25vw, 96px"
						className="object-cover"
					/>
				) : (
					<span className="flex size-full items-center justify-center p-1 text-center text-2xs text-muted-foreground leading-tight">
						{book.title}
					</span>
				)}
			</TooltipTrigger>
			<TooltipContent className="flex max-w-60 flex-col items-start gap-0.5 text-start">
				<span className="font-medium leading-snug">{book.title}</span>
				<span className="text-xs opacity-80">
					{formatBookAuthors(book.authors)}
				</span>
				{book.finished ? (
					<span className="text-2xs opacity-70">Finished {book.finished}</span>
				) : null}
			</TooltipContent>
		</Tooltip>
	);
}

/** Overview: the finished books as covers, and when they were finished. The header and scoreboard sit above the tabs. */
export function OverviewTab({
	data,
	username,
}: {
	data: MemberStatsOverviewOutput;
	username: string;
}) {
	const extra = data.booksRead.total - data.booksRead.books.length;
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
									<CoverTile book={book} />
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
					<HistogramChart points={data.readsOverTime.points} />
				</StatsSection>
			) : null}
		</div>
	);
}
