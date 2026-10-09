"use client";

import { MAX_FAVORITES_PER_USER } from "@bbrc/shared";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { BookCard } from "@/components/blocks/book-card";
import { authClient } from "@/lib/auth-client";
import {
	toBookListCallInput,
	useBookListingSearchParams,
} from "@/lib/listing/books-listing";
import { orpc } from "@/utils/orpc";

const booksGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

function BooksListSkeleton() {
	return (
		<div className={booksGridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-44 w-full" />
			))}
		</div>
	);
}

export function BooksList() {
	const [params] = useBookListingSearchParams();
	const listInput = toBookListCallInput(params);
	const { data: session } = authClient.useSession();

	const engagementQuery = useQuery({
		...orpc.favorite.getViewerLibraryEngagement.queryOptions(),
		enabled: Boolean(session?.user),
	});

	const readSlugSet = useMemo(
		() => new Set(engagementQuery.data?.readSlugs ?? []),
		[engagementQuery.data?.readSlugs],
	);

	const favoriteSlugSet = useMemo(
		() => new Set(engagementQuery.data?.favoriteSlugs ?? []),
		[engagementQuery.data?.favoriteSlugs],
	);

	const slotsUsed = engagementQuery.data?.slotsUsed ?? 0;
	const maxSlots = engagementQuery.data?.maxSlots ?? MAX_FAVORITES_PER_USER;

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
		orpc.book.getBookList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				...listInput,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const books = data?.pages.flatMap((page) => page.items) ?? [];
	const filteredTotal = data?.pages[0]?.metadata.total;

	const engagementLoading = Boolean(session?.user) && engagementQuery.isPending;

	const countLabel =
		filteredTotal == null
			? null
			: filteredTotal === 1
				? "1 book"
				: `${filteredTotal.toLocaleString()} books`;

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
			isEmpty={books.length === 0}
			emptyTitle="No books yet"
			emptyDescription="When books are added to the club library, they will show up here."
			loadingContent={<BooksListSkeleton />}
			endMessage="You have reached the end of the list."
		>
			{isPending && filteredTotal == null ? (
				<Skeleton className="h-5 w-24" aria-hidden />
			) : countLabel ? (
				<p className="border-border border-b pb-2 font-medium text-muted-foreground text-sm tabular-nums">
					{countLabel}
				</p>
			) : null}
			<ul className={booksGridClassName}>
				{books.map((book) => {
					const listEngagement = !session?.user
						? undefined
						: engagementLoading
							? null
							: {
									slotsUsed,
									maxSlots,
									canFavorite: readSlugSet.has(book.slug),
									isFavorite: favoriteSlugSet.has(book.slug),
								};

					const viewerHasRead = !session?.user
						? undefined
						: engagementLoading
							? null
							: readSlugSet.has(book.slug);

					return (
						<li key={book.slug} className="min-h-0">
							<BookCard
								book={book}
								listEngagement={listEngagement}
								viewerHasRead={viewerHasRead}
							/>
						</li>
					);
				})}
			</ul>
		</InfiniteScroll>
	);
}
