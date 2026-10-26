"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { useMemo } from "react";
import {
	InsightsClearButton,
	InsightsFilterRow,
	InsightsMultiPicker,
	InsightsSearch,
	InsightsSelect,
} from "@/components/blocks/author/author-insights-filters";
import {
	AuthorTabEmptyContent,
	authorTabGridClassName,
} from "@/components/blocks/author/author-tab-shell";
import { ShelfCatalogCard } from "@/components/blocks/shelf-catalog-card";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { orpc } from "@/utils/orpc";

const LIMIT = 12;

const TYPES = ["ordered", "unordered"] as const;
const SORTS = ["updated", "newest", "authorBooks", "books", "views"] as const;

const TYPE_LABELS = { ordered: "Ranked", unordered: "Unranked" } as const;
const SORT_OPTIONS = [
	{ value: "updated", label: "Recently updated" },
	{ value: "newest", label: "Newest first" },
	{ value: "authorBooks", label: "Most of their books" },
	{ value: "books", label: "Most books" },
	{ value: "views", label: "Most viewed" },
] as const;
const MIN_OPTIONS = [
	{ value: "0", label: "Any number of their books" },
	{ value: "2", label: "2 or more of their books" },
	{ value: "3", label: "3 or more of their books" },
	{ value: "5", label: "5 or more of their books" },
] as const;

export function AuthorTabShelves({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const [filters, setFilters] = useQueryStates(
		{
			q: parseAsString.withDefault(""),
			type: parseAsArrayOf(parseAsStringLiteral(TYPES)).withDefault([]),
			owners: parseAsArrayOf(parseAsString).withDefault([]),
			books: parseAsArrayOf(parseAsString).withDefault([]),
			min: parseAsInteger.withDefault(0),
			sort: parseAsStringLiteral(SORTS).withDefault("updated"),
		},
		{ clearOnDefault: true },
	);

	const input = useMemo(
		() => ({
			slug,
			limit: LIMIT,
			sort: filters.sort,
			...(filters.q ? { search: filters.q } : {}),
			...(filters.type.length > 0 ? { types: filters.type } : {}),
			...(filters.owners.length > 0 ? { ownerUsernames: filters.owners } : {}),
			...(filters.books.length > 0 ? { bookSlugs: filters.books } : {}),
			...(filters.min > 0 ? { minAuthorBooks: filters.min } : {}),
		}),
		[slug, filters],
	);

	const query = useInfiniteQuery(
		orpc.authorInsights.shelves.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (last) => last.metadata.nextCursor ?? undefined,
			input: (cursor) => ({
				...input,
				...(cursor != null ? { cursor } : {}),
			}),
			placeholderData: (previous) => previous,
		}),
	);

	const items = query.data?.pages.flatMap((page) => page.items) ?? [];
	const facets = query.data?.pages[0]?.facets;
	const narrowed =
		filters.q !== "" ||
		filters.type.length > 0 ||
		filters.owners.length > 0 ||
		filters.books.length > 0 ||
		filters.min > 0;

	const typeOptions = TYPES.map((value) => ({
		value,
		label: TYPE_LABELS[value],
		hint: facets?.types[value],
	}));
	const ownerOptions = (facets?.owners ?? []).map(({ member, count }) => ({
		value: member.username,
		label: member.name,
		hint: count,
		lead: <UserAvatar user={member} className="size-5" />,
	}));
	const bookOptions = (facets?.books ?? []).map(({ book, count }) => ({
		value: book.slug,
		label: book.title,
		hint: count,
	}));

	return (
		<div className="flex flex-col gap-4">
			<InsightsFilterRow>
				<InsightsSearch
					label="Search shelves"
					placeholder="Search shelves or their owners…"
					value={filters.q}
					onChange={(q) => void setFilters({ q })}
				/>
				<InsightsMultiPicker
					label="Type"
					options={typeOptions}
					selected={filters.type}
					onChange={(type) =>
						void setFilters({ type: type as (typeof TYPES)[number][] })
					}
				/>
				{ownerOptions.length > 1 ? (
					<InsightsMultiPicker
						label="Owners"
						options={ownerOptions}
						selected={filters.owners}
						onChange={(owners) => void setFilters({ owners })}
					/>
				) : null}
				{bookOptions.length > 1 ? (
					<InsightsMultiPicker
						label="Books"
						options={bookOptions}
						selected={filters.books}
						onChange={(books) => void setFilters({ books })}
					/>
				) : null}
				<InsightsSelect
					label="Number of their books"
					value={String(filters.min)}
					options={MIN_OPTIONS}
					onChange={(min) => void setFilters({ min: Number(min) })}
				/>
				<InsightsSelect
					label="Sort shelves"
					prefix="Sort"
					value={filters.sort}
					options={SORT_OPTIONS}
					onChange={(sort) => void setFilters({ sort })}
				/>
				<InsightsClearButton
					active={narrowed}
					onClear={() =>
						void setFilters({
							q: null,
							type: null,
							owners: null,
							books: null,
							min: null,
						})
					}
				/>
			</InsightsFilterRow>

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
				isEmpty={items.length === 0}
				emptyContent={
					narrowed ? (
						<div className="flex flex-col items-center gap-2 border border-border border-dashed px-4 py-10 text-center">
							<p className="text-sm">No shelf matches these filters.</p>
						</div>
					) : (
						<AuthorTabEmptyContent
							authorSlug={slug}
							text={`No public shelf holds a book by ${authorName} yet.`}
						/>
					)
				}
				loadingContent={
					<div className={authorTabGridClassName} aria-hidden>
						{Array.from({ length: 3 }, (_, index) => (
							<Skeleton key={index} className="h-72 w-full" />
						))}
					</div>
				}
				endMessage="That is every shelf."
			>
				<ul className={authorTabGridClassName}>
					{items.map((shelf) => {
						const share =
							shelf.bookCount > 0
								? Math.round((shelf.authorBookCount / shelf.bookCount) * 100)
								: 0;
						return (
							<li
								key={`${shelf.owner.username}/${shelf.slug}`}
								className="flex flex-col gap-1.5"
							>
								<ShelfCatalogCard
									className="flex-1"
									impressionSource="other"
									shelf={{
										...shelf,
										collaborators: [],
										collaboratorCount: 0,
									}}
								/>
								<div className="flex flex-col gap-1">
									<div
										className="h-1 w-full bg-muted"
										role="img"
										aria-label={`${share}% of this shelf is by ${authorName}`}
									>
										<div
											className="h-full bg-primary"
											style={{ width: `${share}%` }}
										/>
									</div>
									<p className="text-muted-foreground text-xs tabular-nums">
										{shelf.authorBookCount} of {shelf.bookCount}{" "}
										{shelf.bookCount === 1 ? "book is" : "books are"} by{" "}
										{authorName}
									</p>
								</div>
							</li>
						);
					})}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
