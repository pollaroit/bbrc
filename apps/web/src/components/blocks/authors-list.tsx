"use client";

import type { AuthorListItem } from "@bbrc/api/modules/author/author.schema";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AuthorCard } from "@/components/blocks/author-card";
import {
	toAuthorListCallInput,
	useAuthorsListingSearchParams,
} from "@/lib/listing/authors-listing";
import { orpc } from "@/utils/orpc";

const authorsGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

function AuthorsListSkeleton() {
	return (
		<div className={authorsGridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-32 w-full" />
			))}
		</div>
	);
}

export function AuthorsList() {
	const [params] = useAuthorsListingSearchParams();
	const listInput = toAuthorListCallInput(params);

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
		orpc.author.getList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				...listInput,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const authors = useMemo(() => {
		const seen = new Set<string>();
		const merged: AuthorListItem[] = [];

		for (const page of data?.pages ?? []) {
			for (const author of page.items) {
				if (seen.has(author.slug)) {
					continue;
				}
				seen.add(author.slug);
				merged.push(author);
			}
		}

		return merged;
	}, [data?.pages]);
	const filteredTotal = data?.pages[0]?.metadata.total;

	const countLabel =
		filteredTotal == null
			? null
			: filteredTotal === 1
				? "1 author"
				: `${filteredTotal.toLocaleString()} authors`;

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
			isEmpty={!isPending && authors.length === 0}
			emptyTitle="No authors found"
			emptyDescription="Try a different search or clear filters."
			loadingContent={<AuthorsListSkeleton />}
			endMessage="You have reached the end of the list."
		>
			{isPending && filteredTotal == null ? (
				<Skeleton className="h-5 w-24" aria-hidden />
			) : countLabel ? (
				<p className="border-border border-b pb-2 font-medium text-muted-foreground text-sm tabular-nums">
					{countLabel}
				</p>
			) : null}
			<ul className={authorsGridClassName}>
				{authors.map((author) => (
					<li key={author.slug} className="min-h-0">
						<AuthorCard author={author} />
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
