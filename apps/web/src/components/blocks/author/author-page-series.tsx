"use client";

import type { AuthorSeriesItem } from "@bbrc/api/modules/author/author.schema";
import { Alert, AlertDescription, AlertTitle } from "@bbrc/ui/components/alert";
import { Progress } from "@bbrc/ui/components/progress";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { BookCheck } from "lucide-react";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import { AuthorPageCover, AuthorPageEmpty } from "./author-page-bits";

function progressLine(item: AuthorSeriesItem): string | null {
	if (!item.progress) {
		return null;
	}
	return `You have read ${item.progress.read} of ${item.progress.total} in the series`;
}

function SeriesBlock({ item }: { item: AuthorSeriesItem }) {
	const others = item.bookCount - item.authorBookCount;

	return (
		<article className="flex flex-col gap-3 border border-border p-4">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<div className="flex min-w-0 flex-col gap-0.5">
					<h2 className="font-semibold text-base tracking-tight">
						<Link
							href={`/series/${item.slug}` as Route}
							className="hover:underline"
						>
							{item.title}
						</Link>
					</h2>
					<p className="text-muted-foreground text-xs">
						{item.bookCount} {item.bookCount === 1 ? "book" : "books"}
						{others > 0 ? `, ${item.authorBookCount} by this author` : ""}
					</p>
				</div>
				{progressLine(item) ? (
					<p className="text-muted-foreground text-xs tabular-nums">
						{progressLine(item)}
					</p>
				) : null}
			</div>

			{item.progress ? (
				<Progress
					value={item.progress.percent}
					aria-label={`Your progress in ${item.title}`}
				/>
			) : null}

			<ol className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
				{item.books.map((entry) => (
					<li key={entry.book.slug}>
						<Link
							href={`/books/${entry.book.slug}` as Route}
							className={cn(
								"flex flex-col gap-1",
								!entry.byThisAuthor && "opacity-60",
							)}
							title={
								entry.byThisAuthor
									? entry.book.title
									: `${entry.book.title} (by another author)`
							}
						>
							<div className="relative">
								<AuthorPageCover
									coverId={entry.book.coverId}
									title={entry.book.title}
									sizes="(max-width: 640px) 25vw, 120px"
									className={cn(entry.byThisAuthor && "ring-2 ring-foreground")}
								/>
								{entry.readByMe ? (
									<span className="absolute top-1 right-1 grid size-5 place-items-center bg-success text-background">
										<BookCheck className="size-3" aria-hidden />
										<span className="sr-only">You have read this</span>
									</span>
								) : null}
							</div>
							<span className="text-muted-foreground text-xs tabular-nums">
								#{entry.position}
							</span>
							<span className="line-clamp-2 text-xs leading-snug">
								{entry.book.title}
							</span>
						</Link>
					</li>
				))}
			</ol>
		</article>
	);
}

export function AuthorPageSeries({ slug }: { slug: string }) {
	const { data, isPending, isError, refetch } = useQuery(
		orpc.author.series.queryOptions({ input: { slug } }),
	);

	if (isPending) {
		return (
			<div className="flex flex-col gap-4" aria-hidden>
				<Skeleton className="h-56 w-full" />
				<Skeleton className="h-56 w-full" />
			</div>
		);
	}

	if (isError) {
		return (
			<Alert variant="destructive">
				<AlertTitle>Could not load the series</AlertTitle>
				<AlertDescription>
					<button
						type="button"
						className="underline underline-offset-4"
						onClick={() => void refetch()}
					>
						Try again
					</button>
				</AlertDescription>
			</Alert>
		);
	}

	if (data.items.length === 0) {
		return (
			<AuthorPageEmpty>
				None of this author&apos;s books belong to a reading series in the
				library yet.
			</AuthorPageEmpty>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<p className="text-muted-foreground text-xs">
				Books by this author have a dark outline; the others in the series are
				dimmed.
			</p>
			{data.items.map((item) => (
				<SeriesBlock key={item.slug} item={item} />
			))}
		</div>
	);
}
