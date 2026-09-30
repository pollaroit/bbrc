"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { SittingCard } from "@/components/blocks/sitting-card";
import {
	toSittingListCallInput,
	useSittingListingSearchParams,
} from "@/lib/listing/sittings-listing";
import { orpc } from "@/utils/orpc";

const sittingsGridClassName =
	"grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

function SittingsListSkeleton() {
	return (
		<div className={sittingsGridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-28 w-full" />
			))}
		</div>
	);
}

export function SittingsList() {
	const [params] = useSittingListingSearchParams();
	const listInput = toSittingListCallInput(params);

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

	return (
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
			emptyTitle="No sittings yet"
			emptyDescription="When the club starts a reading sitting, it will show up here."
			loadingContent={<SittingsListSkeleton />}
			endMessage="You have reached the end of the list."
		>
			<ul className={sittingsGridClassName}>
				{sittings.map((sitting) => (
					<li key={sitting.slug} className="min-h-0">
						<SittingCard sitting={sitting} />
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
