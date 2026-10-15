"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { ShelfCover } from "@/components/blocks/shelf-cover";
import {
	toSeriesListCallInput,
	useSeriesListingSearchParams,
} from "@/lib/listing/series-listing";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const gridClassName = "grid grid-cols-1 gap-4 lg:grid-cols-2";

function SeriesListSkeleton() {
	return (
		<div className={gridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-36 w-full" />
			))}
		</div>
	);
}

export function SeriesList() {
	const [params] = useSeriesListingSearchParams();
	const listInput = toSeriesListCallInput(params);

	const {
		data,
		error,
		fetchNextPage,
		hasNextPage,
		isError,
		isFetchingNextPage,
		isPending,
		refetch,
	} = useInfiniteQuery(
		orpc.series.getList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				...listInput,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const seriesItems = data?.pages.flatMap((page) => page.items) ?? [];

	return (
		<InfiniteScroll
			className="flex flex-col gap-4"
			hasNextPage={hasNextPage}
			isFetchingNextPage={isFetchingNextPage}
			fetchNextPage={() => {
				void fetchNextPage();
			}}
			isPending={isPending}
			isError={isError}
			error={error}
			onRetry={() => {
				void refetch();
			}}
			isEmpty={seriesItems.length === 0}
			emptyTitle="No series yet"
			emptyDescription="When admins curate reading order for a multi-book series, it will appear here."
			loadingContent={<SeriesListSkeleton />}
			endMessage="You have reached the end of the list."
		>
			{seriesItems.length > 0 ? (
				<div className={gridClassName}>
					{seriesItems.map((series) => (
						<Link
							key={series.slug}
							href={`/series/${series.slug}` as Route}
							className="group flex gap-5 border border-border bg-card p-5 transition-colors hover:bg-muted/20"
						>
							<div className="relative shrink-0">
								<ShelfCover
									coverIds={series.coverPreviewCoverIds}
									size="md"
									className="shrink-0"
								/>
								<span
									className={cn(
										"absolute -right-1 -bottom-1 border border-border bg-background px-1.5 py-0.5 font-medium text-xs tabular-nums",
										series.bookCount === 0 && "text-muted-foreground",
									)}
								>
									{series.bookCount}
								</span>
							</div>
							<div className="flex min-w-0 flex-col justify-center gap-2">
								<h2 className="font-semibold text-lg leading-snug tracking-tight group-hover:underline group-hover:underline-offset-4">
									{series.title}
								</h2>
								{series.description ? (
									<p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
										{series.description}
									</p>
								) : (
									<p className="text-muted-foreground text-sm">
										{series.bookCount === 1
											? "1 book in order"
											: `${series.bookCount} books in order`}
									</p>
								)}
							</div>
						</Link>
					))}
				</div>
			) : null}
		</InfiniteScroll>
	);
}
