"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import type { Route } from "next";
import {
	parseAsArrayOf,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { useMemo } from "react";
import {
	INSIGHTS_BOOK_SHAPE,
	InsightsBookCover,
} from "@/components/blocks/author/author-insights-covers";
import {
	InsightsClearButton,
	InsightsFilterRow,
	InsightsMultiPicker,
	InsightsSearch,
	InsightsSelect,
} from "@/components/blocks/author/author-insights-filters";
import {
	AuthorTabEmptyContent,
	AuthorTabHeading,
	authorTabGridClassName,
} from "@/components/blocks/author/author-tab-shell";
import { ClubDateTime } from "@/components/blocks/club-date-time";
import { UserPanel } from "@/components/blocks/user-panel";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const LIMIT = 24;

const BOOK_SORTS = ["count", "title", "recent"] as const;
const MEMBER_SORTS = ["recent", "name", "most"] as const;

const BOOK_SORT_OPTIONS = [
	{ value: "count", label: "Most favorited" },
	{ value: "recent", label: "Latest favorite" },
	{ value: "title", label: "Title A–Z" },
] as const;
const MEMBER_SORT_OPTIONS = [
	{ value: "recent", label: "Latest first" },
	{ value: "most", label: "Most of their books" },
	{ value: "name", label: "Name A–Z" },
] as const;

export function AuthorTabFavorites({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const [filters, setFilters] = useQueryStates(
		{
			q: parseAsString.withDefault(""),
			books: parseAsArrayOf(parseAsString).withDefault([]),
			bookSort: parseAsStringLiteral(BOOK_SORTS).withDefault("count"),
			memberSort: parseAsStringLiteral(MEMBER_SORTS).withDefault("recent"),
		},
		{ clearOnDefault: true },
	);

	const input = useMemo(
		() => ({
			slug,
			limit: LIMIT,
			bookSort: filters.bookSort,
			memberSort: filters.memberSort,
			...(filters.q ? { search: filters.q } : {}),
			...(filters.books.length > 0 ? { bookSlugs: filters.books } : {}),
		}),
		[slug, filters],
	);

	// Every book with a favorite, without filters: the options of the Books picker.
	const allBooks = useQuery(
		orpc.authorInsights.favorites.queryOptions({
			input: { slug, limit: 1, bookSort: "count", memberSort: "recent" },
		}),
	);

	const query = useInfiniteQuery(
		orpc.authorInsights.favorites.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (last) => last.members.metadata.nextCursor ?? undefined,
			input: (cursor) => ({
				...input,
				...(cursor != null ? { cursor } : {}),
			}),
			placeholderData: (previous) => previous,
		}),
	);

	const first = query.data?.pages[0];
	const members = query.data?.pages.flatMap((page) => page.members.items) ?? [];
	const narrowed = filters.q !== "" || filters.books.length > 0;
	const nothingAtAll =
		allBooks.data != null && allBooks.data.totalFavorites === 0;

	if (nothingAtAll) {
		return (
			<AuthorTabEmptyContent
				authorSlug={slug}
				text={`No one has put a book by ${authorName} among their favorites yet.`}
			/>
		);
	}

	const bookOptions = (allBooks.data?.books ?? []).map(({ book, count }) => ({
		value: book.slug,
		label: book.title,
		hint: count,
	}));
	const topCount = Math.max(1, ...(first?.books.map((row) => row.count) ?? []));

	function toggleBook(bookSlug: string) {
		void setFilters({
			books: filters.books.includes(bookSlug)
				? filters.books.filter((value) => value !== bookSlug)
				: [...filters.books, bookSlug],
		});
	}

	return (
		<div className="flex flex-col gap-6">
			<InsightsFilterRow>
				<InsightsSearch
					label="Search favorites"
					placeholder="Search members or books…"
					value={filters.q}
					onChange={(q) => void setFilters({ q })}
				/>
				{bookOptions.length > 1 ? (
					<InsightsMultiPicker
						label="Books"
						options={bookOptions}
						selected={filters.books}
						onChange={(books) => void setFilters({ books })}
					/>
				) : null}
				<InsightsSelect
					label="Sort books"
					prefix="Books"
					value={filters.bookSort}
					options={BOOK_SORT_OPTIONS}
					onChange={(bookSort) => void setFilters({ bookSort })}
				/>
				<InsightsSelect
					label="Sort members"
					prefix="Members"
					value={filters.memberSort}
					options={MEMBER_SORT_OPTIONS}
					onChange={(memberSort) => void setFilters({ memberSort })}
				/>
				<InsightsClearButton
					active={narrowed}
					onClear={() => void setFilters({ q: null, books: null })}
				/>
			</InsightsFilterRow>

			<section aria-labelledby="author-favorite-books" className="space-y-3">
				<div id="author-favorite-books">
					<AuthorTabHeading title="Favorite books">
						{first
							? `${first.totalFavorites} ${first.totalFavorites === 1 ? "favorite" : "favorites"} from ${first.memberCount} ${first.memberCount === 1 ? "member" : "members"}. Tap a book to filter the members.`
							: " "}
					</AuthorTabHeading>
				</div>
				{first ? (
					first.books.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No book matches these filters.
						</p>
					) : (
						<ul className={authorTabGridClassName}>
							{first.books.map(({ book, count }) => {
								const active = filters.books.includes(book.slug);
								return (
									<li key={book.slug}>
										<button
											type="button"
											aria-pressed={active}
											onClick={() => toggleBook(book.slug)}
											className={cn(
												"flex w-full items-center gap-3 border p-3 text-left transition-colors hover:bg-muted/40",
												active
													? "border-foreground bg-muted/40"
													: "border-border",
											)}
										>
											<InsightsBookCover book={book} className="w-10" />
											<span className="flex min-w-0 flex-1 flex-col gap-1.5">
												<span className="line-clamp-2 font-medium text-sm leading-snug">
													{book.title}
												</span>
												<span
													className="h-1.5 w-full bg-muted"
													role="img"
													aria-label={`${count} of ${topCount} at the top`}
												>
													<span
														className="block h-full bg-pink"
														style={{ width: `${(count / topCount) * 100}%` }}
													/>
												</span>
											</span>
											<span className="inline-flex shrink-0 items-center gap-1 text-sm tabular-nums">
												<Heart className="size-4 text-pink" aria-hidden />
												{count}
											</span>
										</button>
									</li>
								);
							})}
						</ul>
					)
				) : (
					<div className={authorTabGridClassName} aria-hidden>
						{Array.from({ length: 3 }, (_, index) => (
							<Skeleton key={index} className="h-20 w-full" />
						))}
					</div>
				)}
			</section>

			<section aria-labelledby="author-favorite-members" className="space-y-3">
				<div id="author-favorite-members">
					<AuthorTabHeading title="Members" />
				</div>
				<InfiniteScroll
					hasNextPage={query.hasNextPage}
					isFetchingNextPage={query.isFetchingNextPage}
					fetchNextPage={() => {
						void query.fetchNextPage();
					}}
					isPending={query.isPending}
					isError={query.isError}
					error={query.error}
					onRetry={() => {
						void query.refetch();
					}}
					isEmpty={members.length === 0}
					emptyTitle={narrowed ? "No member matches" : "No members to show"}
					emptyDescription={
						narrowed
							? "Try another search or clear the book filter."
							: "Members who keep their favorites private are not listed."
					}
					loadingContent={
						<div className={authorTabGridClassName} aria-hidden>
							{Array.from({ length: 3 }, (_, index) => (
								<Skeleton key={index} className="h-40 w-full" />
							))}
						</div>
					}
					endMessage="That is every member."
				>
					<ul className={authorTabGridClassName}>
						{members.map((item) => (
							<li
								key={item.member.username}
								className="flex h-full flex-col gap-3 border border-border p-4"
							>
								<Link
									href={`/users/${item.member.username}` as Route}
									className="min-w-0 outline-offset-2"
								>
									<UserPanel user={item.member} className="min-w-0" />
								</Link>
								<ul className="flex flex-wrap gap-2">
									{item.books.map((book) => (
										<li key={book.slug} title={book.title}>
											<InsightsBookCover
												book={book}
												linked
												className={cn(INSIGHTS_BOOK_SHAPE, "w-9")}
											/>
										</li>
									))}
								</ul>
								<p className="mt-auto text-muted-foreground text-xs">
									{item.favoriteCount}{" "}
									{item.favoriteCount === 1 ? "book" : "books"} · latest{" "}
									<ClubDateTime value={item.favoritedAt} />
								</p>
							</li>
						))}
					</ul>
				</InfiniteScroll>
			</section>
		</div>
	);
}
