"use client";

import type { AuthorCard as AuthorCardData } from "@bbrc/api/modules/author/author.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { AuthorCard } from "@/components/blocks/author/author-card";
import {
	type AuthorSortField,
	clearAuthorSheetFilters,
	countAuthorSheetFilters,
	toAuthorListCallInput,
	useAuthorsListingSearchParams,
} from "@/lib/listing/authors-listing";
import { orpc, queryClient } from "@/utils/orpc";

const authorsGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

function AuthorsListSkeleton() {
	return (
		<div className={authorsGridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-52 w-full" />
			))}
		</div>
	);
}

export function AuthorsListGrid() {
	const [params, setParams] = useAuthorsListingSearchParams();
	const listInput = toAuthorListCallInput(params);
	const narrowed =
		countAuthorSheetFilters(params) > 0 || Boolean(params.search?.trim());

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
		orpc.author.list.infiniteOptions({
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
		const merged: AuthorCardData[] = [];
		for (const page of data?.pages ?? []) {
			for (const author of page.items) {
				if (seen.has(author.slug)) continue;
				seen.add(author.slug);
				merged.push(author);
			}
		}
		return merged;
	}, [data?.pages]);

	// Each card's follow button reads `follow.state`; the list already knows it, so seed the
	// cache instead of sending one request per card (the browser only keeps a few open).
	useEffect(() => {
		for (const author of authors) {
			const { queryKey } = orpc.follow.state.queryOptions({
				input: { target: { type: "author", slug: author.slug } },
			});
			if (queryClient.getQueryData(queryKey) === undefined) {
				queryClient.setQueryData(queryKey, {
					following: author.followedByMe,
					followerCount: author.followerCount,
				});
			}
		}
	}, [authors]);

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
			emptyContent={
				<Empty>
					<EmptyHeader>
						<EmptyTitle>
							{narrowed ? "No authors match" : "No authors yet"}
						</EmptyTitle>
						<EmptyDescription>
							{narrowed
								? "Try a different name or clear the filters."
								: "Authors appear here once their books are in the library."}
						</EmptyDescription>
					</EmptyHeader>
					{narrowed ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								clearAuthorSheetFilters(setParams);
								void setParams({ search: null });
							}}
						>
							Clear filters
						</Button>
					) : null}
				</Empty>
			}
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
						<AuthorCard
							author={author}
							sortBy={params.sortBy as AuthorSortField}
						/>
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
