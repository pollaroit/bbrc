"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
	ShelfCatalogCard,
	shelvesGridClassName,
} from "@/components/blocks/shelf-catalog-card";
import {
	toShelfListCallInput,
	useShelvesListingSearchParams,
} from "@/lib/listing/shelves-listing";
import { orpc } from "@/utils/orpc";

function ShelvesListSkeleton() {
	return (
		<div className={shelvesGridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-72 w-full" />
			))}
		</div>
	);
}

export function ShelvesList() {
	const [params] = useShelvesListingSearchParams();
	const listInput = toShelfListCallInput(params);

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
		orpc.shelf.getList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				...listInput,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const shelves = data?.pages.flatMap((page) => page.items) ?? [];

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
			isEmpty={shelves.length === 0}
			emptyTitle="No shelves found"
			emptyDescription="No shelves match these filters. Try clearing them, or check back when members publish more."
			loadingContent={<ShelvesListSkeleton />}
			endMessage="You have reached the end of the list."
		>
			<ul className={shelvesGridClassName}>
				{shelves.map((shelf) => (
					<li key={shelf.id}>
						<ShelfCatalogCard shelf={shelf} />
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
