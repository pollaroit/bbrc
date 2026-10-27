"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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

const MINIMUMS = [0, 2, 3, 5] as const;

export function AuthorTabShelves({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const t = useTranslations("authors");
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

	const sortOptions = SORTS.map((value) => ({
		value,
		label: t(`shelvesTab.sort.${value}`),
	}));
	const minOptions = MINIMUMS.map((value) => ({
		value: String(value),
		label:
			value === 0
				? t("shelvesTab.min.any")
				: t("shelvesTab.min.n", { count: value }),
	}));
	const typeOptions = TYPES.map((value) => ({
		value,
		label: t(`shelvesTab.type.${value}`),
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
					label={t("shelvesTab.searchLabel")}
					placeholder={t("shelvesTab.searchPlaceholder")}
					value={filters.q}
					onChange={(q) => void setFilters({ q })}
				/>
				<InsightsMultiPicker
					label={t("shelvesTab.typeLabel")}
					options={typeOptions}
					selected={filters.type}
					onChange={(type) =>
						void setFilters({ type: type as (typeof TYPES)[number][] })
					}
				/>
				{ownerOptions.length > 1 ? (
					<InsightsMultiPicker
						label={t("shelvesTab.owners")}
						options={ownerOptions}
						selected={filters.owners}
						onChange={(owners) => void setFilters({ owners })}
					/>
				) : null}
				{bookOptions.length > 1 ? (
					<InsightsMultiPicker
						label={t("shelvesTab.books")}
						options={bookOptions}
						selected={filters.books}
						onChange={(books) => void setFilters({ books })}
					/>
				) : null}
				<InsightsSelect
					label={t("shelvesTab.minLabel")}
					value={String(filters.min)}
					options={minOptions}
					onChange={(min) => void setFilters({ min: Number(min) })}
				/>
				<InsightsSelect
					label={t("shelvesTab.sortLabel")}
					prefix={t("shelvesTab.sortPrefix")}
					value={filters.sort}
					options={sortOptions}
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
							<p className="text-sm">{t("shelvesTab.noMatch")}</p>
						</div>
					) : (
						<AuthorTabEmptyContent
							authorSlug={slug}
							text={t("shelvesTab.empty", { name: authorName })}
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
				endMessage={t("shelvesTab.end")}
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
										aria-label={t("shelvesTab.shareLabel", {
											share,
											name: authorName,
										})}
									>
										<div
											className="h-full bg-primary"
											style={{ width: `${share}%` }}
										/>
									</div>
									<p className="text-muted-foreground text-xs tabular-nums">
										{t("shelvesTab.shareLine", {
											authorBooks: shelf.authorBookCount,
											books: shelf.bookCount,
											name: authorName,
										})}
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
