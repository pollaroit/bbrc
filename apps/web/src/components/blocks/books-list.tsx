"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BookCard } from "@/components/blocks/book-card";
import {
	toBookListCallInput,
	useBookListingSearchParams,
} from "@/lib/listing/books-listing";
import { orpc } from "@/utils/orpc";

const booksGridClassName =
	"grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

function BooksListSkeleton() {
	return (
		<div className={booksGridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-36 w-full" />
			))}
		</div>
	);
}

export function BooksList() {
	const [params] = useBookListingSearchParams();
	const listInput = toBookListCallInput(params);

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
			<ul className={booksGridClassName}>
				{books.map((book) => (
					<li key={book.slug} className="min-h-0">
						<BookCard book={book} />
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
