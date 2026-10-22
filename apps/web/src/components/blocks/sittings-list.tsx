"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { SittingListCard } from "@/components/blocks/sitting-list-card";
import {
	hasActiveSittingFilters,
	toSittingListCallInput,
	useSittingListingSearchParams,
} from "@/lib/listing/sittings-listing";
import { orpc } from "@/utils/orpc";

const sittingsGridClassName = "grid grid-cols-1 gap-3 md:grid-cols-2";

function SittingsListSkeleton() {
	return (
		<div className={sittingsGridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-40 w-full" />
			))}
		</div>
	);
}

export function SittingsList() {
	const [params] = useSittingListingSearchParams();
	const listInput = toSittingListCallInput(params);
	const filtered = hasActiveSittingFilters(params);

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
		orpc.sitting.getSittingList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				...listInput,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const sittings = data?.pages.flatMap((page) => page.items) ?? [];
	const total = data?.pages[0]?.metadata.total;

	return (
		<div className="flex flex-col gap-4">
			{total != null ? (
				<p className="text-muted-foreground text-sm tabular-nums">
					{total} sitting{total === 1 ? "" : "s"}
					{filtered ? " match your filters" : ""}
				</p>
			) : null}
			<InfiniteScroll
				className="flex flex-col gap-3"
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
				isEmpty={sittings.length === 0}
				emptyTitle={
					filtered ? "No sittings match these filters" : "No sittings yet"
				}
				emptyDescription={
					filtered
						? "Try clearing filters or changing your search."
						: "When the club starts a reading sitting, it will show up here."
				}
				loadingContent={<SittingsListSkeleton />}
				endMessage="You have reached the end of the list."
			>
				<ul className={sittingsGridClassName}>
					{sittings.map((sitting) => (
						<li key={sitting.slug} className="min-h-0">
							<SittingListCard sitting={sitting} />
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
