"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { ShelfCover } from "@/components/blocks/shelf-cover";
import {
	toShelfListCallInput,
	useShelvesListingSearchParams,
} from "@/lib/listing/shelves-listing";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const shelvesGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

function shelfHref(username: string, slug: string) {
	return `/users/${username}/shelves/${slug}` as Route;
}

function ShelvesListSkeleton() {
	return (
		<div className={shelvesGridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-40 w-full" />
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
			emptyTitle="No public shelves yet"
			emptyDescription="When members publish reading lists, they will appear here."
			loadingContent={<ShelvesListSkeleton />}
			endMessage="You have reached the end of the list."
		>
			<ul className={shelvesGridClassName}>
				{shelves.map((shelf) => (
					<li key={shelf.id}>
						<Link
							href={shelfHref(shelf.owner.username, shelf.slug)}
							className={cn(
								"flex h-full flex-col gap-3 border border-border p-4 transition-colors",
								"hover:bg-muted/40",
							)}
						>
							<ShelfCover coverIds={shelf.coverPreviewCoverIds} size="md" />
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="font-semibold leading-snug">{shelf.title}</h2>
								{shelf.type === "ordered" ? (
									<Badge variant="secondary">Ranked</Badge>
								) : (
									<Badge variant="outline">List</Badge>
								)}
							</div>
							<p className="text-muted-foreground text-sm">
								by <span className="text-foreground">{shelf.owner.name}</span>{" "}
								<span className="tabular-nums">@{shelf.owner.username}</span>
							</p>
							{shelf.description ? (
								<p className="line-clamp-2 text-muted-foreground text-sm">
									{shelf.description}
								</p>
							) : null}
							<p className="mt-auto text-muted-foreground text-xs tabular-nums">
								{shelf.bookCount} {shelf.bookCount === 1 ? "book" : "books"}
							</p>
						</Link>
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
