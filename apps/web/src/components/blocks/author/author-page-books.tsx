"use client";

import { MAX_FAVORITES_PER_USER } from "@bbrc/shared";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { AuthorFilteredEmpty } from "@/components/blocks/author/author-filter-bar";
import { AuthorPageBooksToolbar } from "@/components/blocks/author/author-page-books-toolbar";
import { BookCard } from "@/components/blocks/book-card";
import { authClient } from "@/lib/auth-client";
import {
	clearBookSheetFilters,
	countBookSheetFilters,
	toBookListCallInput,
	useBookListingSearchParams,
} from "@/lib/listing/books-listing";
import { orpc } from "@/utils/orpc";

const gridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

function BooksSkeleton() {
	return (
		<div className={gridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-44 w-full" />
			))}
		</div>
	);
}

/**
 * The Books tab: the /books list (same filters, sorts, search and cards) for one author.
 * The author is fixed, so cards leave their name out and only name co-authors.
 */
export function AuthorPageBooks({ slug }: { slug: string }) {
	const t = useTranslations("authors");
	const [params, setParams] = useBookListingSearchParams();
	const { data: session } = authClient.useSession();

	// The author is the page, never a filter: drop whatever `?authors=` may say.
	const { authors: _authors, ...listInput } = toBookListCallInput({
		...params,
		authors: null,
	});

	const engagementQuery = useQuery({
		...orpc.favorite.getViewerLibraryEngagement.queryOptions(),
		enabled: Boolean(session?.user),
	});
	const engagement = engagementQuery.data;

	const readSlugSet = useMemo(
		() => new Set(engagement?.readSlugs ?? []),
		[engagement?.readSlugs],
	);
	const favoriteSlugSet = useMemo(
		() => new Set(engagement?.favoriteSlugs ?? []),
		[engagement?.favoriteSlugs],
	);
	const feedbackBookSlugSet = useMemo(
		() => new Set(engagement?.feedbackBookSlugs ?? []),
		[engagement?.feedbackBookSlugs],
	);
	const feedbackRatingBySlug = useMemo(() => {
		const map = new Map<string, number>();
		for (const row of engagement?.feedbackRatings ?? []) {
			map.set(row.bookSlug, row.rating);
		}
		return map;
	}, [engagement?.feedbackRatings]);

	const slotsUsed = engagement?.slotsUsed ?? 0;
	const maxSlots = engagement?.maxSlots ?? MAX_FAVORITES_PER_USER;
	const engagementLoading = Boolean(session?.user) && engagementQuery.isPending;

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
		orpc.author.books.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			placeholderData: (previous) => previous,
			input: (pageCursor) => ({
				...listInput,
				slug,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const books = data?.pages.flatMap((page) => page.items) ?? [];
	const total = data?.pages[0]?.metadata.total;
	const filtered =
		countBookSheetFilters({ ...params, authors: null }) > 0 ||
		Boolean(params.search?.trim());

	const clearAll = () => {
		clearBookSheetFilters(setParams);
		void setParams({ search: null, subjects: null, subjectsMatch: null });
	};

	return (
		<div className="flex flex-col gap-4">
			<AuthorPageBooksToolbar slug={slug} total={total} />

			<InfiniteScroll
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
				emptyContent={
					<AuthorFilteredEmpty
						filtered={filtered}
						emptyText={t("books.empty")}
						filteredText={t("books.filteredEmpty")}
						onClear={clearAll}
					/>
				}
				loadingContent={<BooksSkeleton />}
				endMessage={t("list.end")}
			>
				<ul className={gridClassName}>
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
									sortBy={params.sortBy ?? "publishedIn"}
									excludeAuthorSlug={slug}
									listEngagement={listEngagement}
									viewerHasRead={viewerHasRead}
									feedbackBookSlugs={
										!session?.user
											? undefined
											: engagementLoading
												? null
												: feedbackBookSlugSet
									}
									viewerBookRating={
										session?.user && !engagementLoading
											? feedbackRatingBySlug.get(book.slug)
											: undefined
									}
								/>
							</li>
						);
					})}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
