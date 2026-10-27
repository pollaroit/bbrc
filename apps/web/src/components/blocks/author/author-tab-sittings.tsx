"use client";

import type { AuthorInsightSittingsOutput } from "@bbrc/api/modules/author-insights/author-insights.schema";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CheckCheck, Users } from "lucide-react";
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
	InsightsRangePicker,
	InsightsSearch,
	InsightsSelect,
	rangeToQuery,
} from "@/components/blocks/author/author-insights-filters";
import {
	AuthorTabEmptyContent,
	authorTabGridClassName,
} from "@/components/blocks/author/author-tab-shell";
import { ClubDateTime } from "@/components/blocks/club-date-time";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { Link } from "@/i18n/navigation";
import { useSittingStatusLabels } from "@/lib/i18n/use-labels";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const LIMIT = 12;

const STATUSES = ["voting", "reading", "finished"] as const;
const OUTCOMES = ["picked", "in_poll", "not_picked"] as const;
const SORTS = ["newest", "oldest", "participants", "deadline"] as const;

const outcomeTone = {
	picked: "bg-success/10 text-success-ink border-success/30",
	in_poll: "bg-warning/10 text-warning-ink border-warning/30",
	not_picked: "bg-muted text-muted-foreground border-border",
} as const;

type SittingItem = AuthorInsightSittingsOutput["items"][number];

function useSittingFilters() {
	return useQueryStates(
		{
			q: parseAsString.withDefault(""),
			status: parseAsArrayOf(parseAsStringLiteral(STATUSES)).withDefault([]),
			outcome: parseAsArrayOf(parseAsStringLiteral(OUTCOMES)).withDefault([]),
			books: parseAsArrayOf(parseAsString).withDefault([]),
			from: parseAsString,
			to: parseAsString,
			sort: parseAsStringLiteral(SORTS).withDefault("newest"),
		},
		{ clearOnDefault: true },
	);
}

export function AuthorTabSittings({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const t = useTranslations("authors");
	const statusLabels = useSittingStatusLabels();
	const [filters, setFilters] = useSittingFilters();
	const sortOptions = SORTS.map((value) => ({
		value,
		label: t(`sittings.sort.${value}`),
	}));

	const input = useMemo(
		() => ({
			slug,
			limit: LIMIT,
			sort: filters.sort,
			...(filters.q ? { search: filters.q } : {}),
			...(filters.status.length > 0 ? { statuses: filters.status } : {}),
			...(filters.outcome.length > 0 ? { outcomes: filters.outcome } : {}),
			...(filters.books.length > 0 ? { bookSlugs: filters.books } : {}),
			...rangeToQuery({ from: filters.from, to: filters.to }),
		}),
		[slug, filters],
	);

	const query = useInfiniteQuery(
		orpc.authorInsights.sittings.infiniteOptions({
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
		filters.status.length > 0 ||
		filters.outcome.length > 0 ||
		filters.books.length > 0 ||
		filters.from != null ||
		filters.to != null;

	const statusOptions = STATUSES.map((value) => ({
		value,
		label: statusLabels[value],
		hint: facets?.statuses[value],
	}));
	const outcomeOptions = OUTCOMES.map((value) => ({
		value,
		label: t(`sittings.outcome.${value}`),
		hint: facets?.outcomes[value],
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
					label={t("sittings.searchLabel")}
					placeholder={t("sittings.searchPlaceholder")}
					value={filters.q}
					onChange={(q) => void setFilters({ q })}
				/>
				<InsightsMultiPicker
					label={t("sittings.status")}
					options={statusOptions}
					selected={filters.status}
					onChange={(status) =>
						void setFilters({ status: status as (typeof STATUSES)[number][] })
					}
				/>
				<InsightsMultiPicker
					label={t("sittings.outcomeLabel")}
					options={outcomeOptions}
					selected={filters.outcome}
					onChange={(outcome) =>
						void setFilters({ outcome: outcome as (typeof OUTCOMES)[number][] })
					}
				/>
				{bookOptions.length > 1 ? (
					<InsightsMultiPicker
						label={t("sittings.books")}
						options={bookOptions}
						selected={filters.books}
						onChange={(books) => void setFilters({ books })}
					/>
				) : null}
				<InsightsRangePicker
					value={{ from: filters.from, to: filters.to }}
					onChange={(range) => void setFilters(range)}
				/>
				<InsightsSelect
					label={t("sittings.sortLabel")}
					prefix={t("sittings.sortPrefix")}
					value={filters.sort}
					options={sortOptions}
					onChange={(sort) => void setFilters({ sort })}
				/>
				<InsightsClearButton
					active={narrowed}
					onClear={() =>
						void setFilters({
							q: null,
							status: null,
							outcome: null,
							books: null,
							from: null,
							to: null,
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
							<p className="text-sm">{t("sittings.noMatch")}</p>
						</div>
					) : (
						<AuthorTabEmptyContent
							authorSlug={slug}
							text={t("sittings.empty", { name: authorName })}
						/>
					)
				}
				loadingContent={<SittingsSkeleton />}
				endMessage={t("sittings.end")}
			>
				<ul className={authorTabGridClassName}>
					{items.map((item) => (
						<li key={item.slug} className="flex">
							<SittingCard item={item} />
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</div>
	);
}

function SittingsSkeleton() {
	return (
		<div className={authorTabGridClassName} aria-hidden>
			{Array.from({ length: 3 }, (_, index) => (
				<Skeleton key={index} className="h-64 w-full" />
			))}
		</div>
	);
}

/** The covers of the author's books in the sitting, fanned out a little. */
function CoverFan({ books }: { books: SittingItem["books"] }) {
	const shown = books.slice(0, 4);
	return (
		<div
			className="flex h-28 items-end border-border border-b bg-muted/40 px-4"
			aria-hidden
		>
			<div className="flex items-end pb-0">
				{shown.map((book, index) => (
					<div
						key={book.slug}
						className={cn("relative", index > 0 && "-ml-5")}
						style={{ zIndex: shown.length - index }}
					>
						<InsightsBookCover
							book={book}
							className={cn(
								INSIGHTS_BOOK_SHAPE,
								index === 0 ? "w-16" : "w-14",
								"shadow-sm",
							)}
							sizes="64px"
						/>
					</div>
				))}
			</div>
			{books.length > shown.length ? (
				<span className="mb-2 ml-3 text-muted-foreground text-xs tabular-nums">
					+{books.length - shown.length}
				</span>
			) : null}
		</div>
	);
}

function SittingCard({ item }: { item: SittingItem }) {
	const t = useTranslations("authors");
	const progress =
		item.participantCount > 0
			? Math.round((item.completedCount / item.participantCount) * 100)
			: 0;
	const showProgress = item.status !== "voting" && item.participantCount > 0;

	return (
		<article className="relative flex w-full flex-col overflow-hidden border border-border bg-background transition-colors hover:bg-muted/30">
			<CoverFan books={item.books} />

			<div className="flex flex-1 flex-col gap-3 p-4">
				<div className="flex flex-wrap items-center gap-2">
					<SittingStatusBadge status={item.status} />
					<span
						className={cn(
							"inline-flex h-5 items-center border px-2 font-medium text-xs",
							outcomeTone[item.outcome],
						)}
					>
						{t(`sittings.outcome.${item.outcome}`)}
					</span>
				</div>

				<h3 className="font-medium text-sm leading-snug">
					<Link
						href={`/sittings/${item.slug}` as Route}
						className="after:absolute after:inset-0"
					>
						{item.displayName}
					</Link>
				</h3>

				<ul className="flex flex-col gap-0.5 text-muted-foreground text-xs">
					{item.books.map((book) => (
						<li key={book.slug} className="truncate">
							{book.title}
						</li>
					))}
				</ul>

				{item.outcome === "not_picked" && item.pickedBook ? (
					<p className="relative z-10 text-muted-foreground text-xs">
						{t.rich("sittings.picked", {
							title: item.pickedBook.title,
							book: (chunks) => (
								<Link
									href={`/books/${item.pickedBook?.slug}` as Route}
									className="underline underline-offset-4 hover:text-foreground"
								>
									{chunks}
								</Link>
							),
						})}
					</p>
				) : null}

				<div className="mt-auto flex flex-col gap-2 pt-1">
					{showProgress ? (
						<div className="flex flex-col gap-1">
							<div
								className="h-1.5 w-full bg-muted"
								role="progressbar"
								aria-label={t("sittings.finishedLabel")}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-valuenow={progress}
							>
								<div
									className="h-full bg-success"
									style={{ width: `${progress}%` }}
								/>
							</div>
							<p className="flex items-center gap-1 text-muted-foreground text-xs tabular-nums">
								<CheckCheck className="size-3.5" aria-hidden />
								{t("sittings.finishedOf", {
									completed: item.completedCount,
									total: item.participantCount,
								})}
							</p>
						</div>
					) : (
						<p className="flex items-center gap-1 text-muted-foreground text-xs tabular-nums">
							<Users className="size-3.5" aria-hidden />
							{item.pollOptionCount > 0
								? t("sittings.membersPoll", {
										count: item.participantCount,
										options: item.pollOptionCount,
									})
								: t("sittings.members", { count: item.participantCount })}
						</p>
					)}

					<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-muted-foreground text-xs tabular-nums">
						<span>
							{item.pollDeadline && item.status === "voting"
								? `${t("sittings.voteEnds")} `
								: item.status === "reading"
									? `${t("sittings.readingEnds")} `
									: ""}
							<ClubDateTime value={item.date} />
						</span>
						{item.organiser ? (
							<span className="relative z-10 inline-flex min-w-0 items-center gap-1.5">
								<UserAvatar user={item.organiser} className="size-5" />
								<Link
									href={`/users/${item.organiser.username}` as Route}
									className="truncate hover:text-foreground hover:underline"
								>
									{item.organiser.name}
								</Link>
							</span>
						) : null}
					</div>
				</div>
			</div>
		</article>
	);
}
