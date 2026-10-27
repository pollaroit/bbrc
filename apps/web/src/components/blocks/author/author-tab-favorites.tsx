"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
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

export function AuthorTabFavorites({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const t = useTranslations("authors");
	const bookSortOptions = (["count", "recent", "title"] as const).map(
		(value) => ({ value, label: t(`favorites.bookSort.${value}`) }),
	);
	const memberSortOptions = (["recent", "most", "name"] as const).map(
		(value) => ({ value, label: t(`favorites.memberSort.${value}`) }),
	);
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
				text={t("favorites.empty", { name: authorName })}
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
					label={t("favorites.searchLabel")}
					placeholder={t("favorites.searchPlaceholder")}
					value={filters.q}
					onChange={(q) => void setFilters({ q })}
				/>
				{bookOptions.length > 1 ? (
					<InsightsMultiPicker
						label={t("favorites.books")}
						options={bookOptions}
						selected={filters.books}
						onChange={(books) => void setFilters({ books })}
					/>
				) : null}
				<InsightsSelect
					label={t("favorites.sortBooks")}
					prefix={t("favorites.sortBooksPrefix")}
					value={filters.bookSort}
					options={bookSortOptions}
					onChange={(bookSort) => void setFilters({ bookSort })}
				/>
				<InsightsSelect
					label={t("favorites.sortMembers")}
					prefix={t("favorites.sortMembersPrefix")}
					value={filters.memberSort}
					options={memberSortOptions}
					onChange={(memberSort) => void setFilters({ memberSort })}
				/>
				<InsightsClearButton
					active={narrowed}
					onClear={() => void setFilters({ q: null, books: null })}
				/>
			</InsightsFilterRow>

			<section aria-labelledby="author-favorite-books" className="space-y-3">
				<div id="author-favorite-books">
					<AuthorTabHeading title={t("favorites.headingBooks")}>
						{first
							? t("favorites.summary", {
									total: first.totalFavorites,
									members: first.memberCount,
								})
							: " "}
					</AuthorTabHeading>
				</div>
				{first ? (
					first.books.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{t("favorites.noBookMatch")}
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
													aria-label={t("favorites.topLabel", {
														count,
														top: topCount,
													})}
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
					<AuthorTabHeading title={t("favorites.headingMembers")} />
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
					emptyTitle={
						narrowed ? t("favorites.noMemberMatch") : t("favorites.noMembers")
					}
					emptyDescription={
						narrowed ? t("favorites.tryAnother") : t("favorites.privateNote")
					}
					loadingContent={
						<div className={authorTabGridClassName} aria-hidden>
							{Array.from({ length: 3 }, (_, index) => (
								<Skeleton key={index} className="h-40 w-full" />
							))}
						</div>
					}
					endMessage={t("favorites.endMembers")}
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
									{t.rich("favorites.memberLine", {
										count: item.favoriteCount,
										date: () => <ClubDateTime value={item.favoritedAt} />,
									})}
								</p>
							</li>
						))}
					</ul>
				</InfiniteScroll>
			</section>
		</div>
	);
}
