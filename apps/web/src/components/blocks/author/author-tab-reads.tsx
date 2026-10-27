"use client";

import type { AuthorReadItem } from "@bbrc/api/modules/author/author.schema";
import { formatReadFinishedMonth } from "@bbrc/shared";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@bbrc/ui/components/toggle-group";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BookCheck, Rows3, StretchHorizontal } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import {
	AuthorFilterBar,
	type AuthorFilterChip,
	AuthorFilteredEmpty,
} from "@/components/blocks/author/author-filter-bar";
import {
	AuthorFilterBooks,
	authorBookFilterChips,
} from "@/components/blocks/author/author-filter-books";
import { AuthorFilterDateRange } from "@/components/blocks/author/author-filter-date-range";
import {
	AuthorFilterBooksPicker,
	AuthorFilterMembers,
	AuthorFilterSeries,
} from "@/components/blocks/author/author-filter-multi-select";
import { AuthorTabEmptyContent } from "@/components/blocks/author/author-tab-shell";
import { EditionChip } from "@/components/blocks/edition-chip";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { ListingSort } from "@/components/listing/listing-sort";
import { Link } from "@/i18n/navigation";
import {
	bookCoverFrameClassName,
	bookCoverUrl,
	formatBookSeriesCardLabel,
} from "@/lib/book-cover";
import {
	AUTHOR_BOOK_FILTER_RESET,
	authorReadSortFields,
	authorReadSortLabels,
	countAuthorBookFilters,
	toAuthorReadsInput,
	useAuthorReadsParams,
	useDebouncedValue,
} from "@/lib/listing/author-activity-listing";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const LIMIT = 24;

function finishedLabel(year: number | null, month: number | null) {
	if (year != null && month != null) {
		return formatReadFinishedMonth({ year, month });
	}
	if (year != null) return String(year);
	return null;
}

function humanize(slug: string) {
	return slug
		.split("-")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function shortDate(date: Date) {
	return date.toLocaleDateString("en", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function ReadCard({ item }: { item: AuthorReadItem }) {
	const finished = finishedLabel(item.finishedYear, item.finishedMonth);
	const coverSrc = bookCoverUrl(item.book.coverId, "M");
	const bookHref = `/books/${item.book.slug}` as Route;
	const series = item.series;

	return (
		<article className="flex h-full flex-col border border-border bg-card">
			<div className="flex min-w-0 gap-3 p-3 sm:gap-4 sm:p-4">
				<Link
					href={bookHref}
					tabIndex={-1}
					aria-hidden
					className={cn(
						"relative block aspect-2/3 w-16 shrink-0 sm:w-20",
						bookCoverFrameClassName,
					)}
				>
					{coverSrc ? (
						<Image
							src={coverSrc}
							alt=""
							fill
							className="object-cover"
							sizes="80px"
						/>
					) : null}
				</Link>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<Link
						href={bookHref}
						className="line-clamp-2 font-semibold text-base leading-snug tracking-tight hover:underline"
					>
						{item.book.title}
					</Link>
					{series ? (
						<Link
							href={`/series/${series.slug}` as Route}
							className="line-clamp-1 text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
						>
							{formatBookSeriesCardLabel(series)}
						</Link>
					) : null}
					<div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2">
						<EditionChip
							bookSlug={item.book.slug}
							edition={item.edition}
							prefix="Read the"
						/>
					</div>
				</div>
			</div>

			<div className="mt-auto flex min-w-0 items-center justify-between gap-3 border-border border-t bg-muted/20 px-3 py-2.5 sm:px-4">
				<Link
					href={`/users/${item.member.username}` as Route}
					className="flex min-w-0 items-center gap-2 outline-offset-2"
				>
					<UserAvatar user={item.member} className="size-7" />
					<span className="min-w-0">
						<span className="block truncate font-medium text-sm leading-tight">
							{item.member.name}
						</span>
						<span className="block truncate text-muted-foreground text-xs">
							@{item.member.username}
						</span>
					</span>
				</Link>
				<div className="flex shrink-0 flex-col items-end text-right">
					<span
						className={cn(
							"inline-flex items-center gap-1 font-medium text-sm tabular-nums",
							!finished && "text-muted-foreground",
						)}
					>
						<BookCheck className="size-3.5 text-success-ink" aria-hidden />
						{finished ?? "Date not set"}
					</span>
					<span className="text-muted-foreground text-xs">
						Logged <RelativeTime date={item.createdAt} className="text-xs" />
					</span>
				</div>
			</div>
		</article>
	);
}

function ReadRow({ item }: { item: AuthorReadItem }) {
	const finished = finishedLabel(item.finishedYear, item.finishedMonth);

	return (
		<div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 border-border border-b px-3 py-2 last:border-b-0 sm:flex-nowrap">
			<Link
				href={`/users/${item.member.username}` as Route}
				className="flex min-w-0 items-center gap-2 sm:w-56 sm:shrink-0"
			>
				<UserAvatar user={item.member} className="size-6" />
				<span className="truncate font-medium text-sm">{item.member.name}</span>
			</Link>
			<Link
				href={`/books/${item.book.slug}` as Route}
				className="min-w-0 flex-1 truncate text-sm hover:underline"
			>
				{item.book.title}
			</Link>
			<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
				{finished ?? "Date not set"}
			</span>
			<span className="hidden shrink-0 text-muted-foreground text-xs sm:inline">
				Logged {shortDate(item.createdAt)}
			</span>
		</div>
	);
}

function ReadsSkeleton({ compact }: { compact: boolean }) {
	if (compact) {
		return (
			<div className="flex flex-col border border-border" aria-hidden>
				{Array.from({ length: 8 }, (_, index) => (
					<Skeleton key={index} className="h-10 w-full" />
				))}
			</div>
		);
	}
	return (
		<div
			className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
			aria-hidden
		>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-44 w-full" />
			))}
		</div>
	);
}

export function AuthorTabReads({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const [params, setParams] = useAuthorReadsParams();
	const search = useDebouncedValue(params.search);
	const compact = params.density === "compact";

	const input = toAuthorReadsInput(slug, params, search);
	const query = useInfiniteQuery(
		orpc.author.reads.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (last) => last.metadata.nextCursor ?? undefined,
			placeholderData: (previous) => previous,
			input: (cursor) => ({
				...input,
				limit: LIMIT,
				...(cursor != null ? { cursor } : {}),
			}),
		}),
	);
	const items = query.data?.pages.flatMap((page) => page.items) ?? [];
	const total = query.data?.pages[0]?.metadata.total;

	const activeCount =
		(params.members?.length ? 1 : 0) +
		(params.books?.length ? 1 : 0) +
		(params.series?.length ? 1 : 0) +
		(params.finishedFrom || params.finishedTo ? 1 : 0) +
		(params.loggedFrom || params.loggedTo ? 1 : 0) +
		countAuthorBookFilters(params);
	const filtered = activeCount > 0 || Boolean(params.search?.trim());

	const clearAll = () => {
		void setParams({
			search: null,
			members: null,
			books: null,
			series: null,
			finishedFrom: null,
			finishedTo: null,
			loggedFrom: null,
			loggedTo: null,
			...AUTHOR_BOOK_FILTER_RESET,
		});
	};

	const withoutValue = (list: string[] | null, value: string) => {
		const next = (list ?? []).filter((item) => item !== value);
		return next.length > 0 ? next : null;
	};

	const chips: AuthorFilterChip[] = [
		...(params.members ?? []).map((username) => ({
			id: `member:${username}`,
			label: `@${username}`,
			onRemove: () =>
				void setParams({ members: withoutValue(params.members, username) }),
		})),
		...(params.books ?? []).map((bookSlug) => ({
			id: `book:${bookSlug}`,
			label: humanize(bookSlug),
			onRemove: () =>
				void setParams({ books: withoutValue(params.books, bookSlug) }),
		})),
		...(params.series ?? []).map((seriesSlug) => ({
			id: `series:${seriesSlug}`,
			label: `Series: ${humanize(seriesSlug)}`,
			onRemove: () =>
				void setParams({ series: withoutValue(params.series, seriesSlug) }),
		})),
		...(params.finishedFrom || params.finishedTo
			? [
					{
						id: "finished",
						label: `Finished ${params.finishedFrom ? shortDate(params.finishedFrom) : "…"} – ${params.finishedTo ? shortDate(params.finishedTo) : "…"}`,
						onRemove: () =>
							void setParams({ finishedFrom: null, finishedTo: null }),
					},
				]
			: []),
		...(params.loggedFrom || params.loggedTo
			? [
					{
						id: "logged",
						label: `Logged ${params.loggedFrom ? shortDate(params.loggedFrom) : "…"} – ${params.loggedTo ? shortDate(params.loggedTo) : "…"}`,
						onRemove: () =>
							void setParams({ loggedFrom: null, loggedTo: null }),
					},
				]
			: []),
		...authorBookFilterChips(params, setParams),
	];

	const resultLabel =
		total == null
			? null
			: `${total.toLocaleString()} ${total === 1 ? "read" : "reads"}${filtered ? " match" : ""}`;

	return (
		<div className="flex flex-col gap-4">
			<AuthorFilterBar
				search={params.search}
				onSearchChange={(value) => void setParams({ search: value })}
				searchPlaceholder="Search by reader, book or series…"
				sort={
					<>
						<ListingSort
							sortBy={params.sortBy ?? "finishedAt"}
							sortDirection={params.sortDirection ?? "desc"}
							onSortByChange={(sortBy) => void setParams({ sortBy })}
							onSortDirectionChange={(sortDirection) =>
								void setParams({ sortDirection })
							}
							sortByOptions={authorReadSortFields}
							sortByLabels={authorReadSortLabels}
						/>
						<ToggleGroup
							value={[compact ? "compact" : "comfortable"]}
							onValueChange={(value) => {
								const next = value[0];
								if (next === "compact" || next === "comfortable") {
									void setParams({
										density: next === "compact" ? "compact" : null,
									});
								}
							}}
							variant="outline"
							size="sm"
							aria-label="Card density"
						>
							<ToggleGroupItem
								value="comfortable"
								aria-label="Comfortable cards"
							>
								<StretchHorizontal />
							</ToggleGroupItem>
							<ToggleGroupItem value="compact" aria-label="Compact rows">
								<Rows3 />
							</ToggleGroupItem>
						</ToggleGroup>
					</>
				}
				sheetTitle="Read filters"
				sheetDescription={`Narrow down the reads of books by ${authorName}.`}
				sheetContent={
					<>
						<AuthorFilterMembers
							slug={slug}
							source="reads"
							selected={params.members ?? []}
							onChange={(next) =>
								void setParams({ members: next.length > 0 ? next : null })
							}
						/>
						<AuthorFilterBooksPicker
							slug={slug}
							selected={params.books ?? []}
							onChange={(next) =>
								void setParams({ books: next.length > 0 ? next : null })
							}
						/>
						<AuthorFilterSeries
							slug={slug}
							selected={params.series ?? []}
							onChange={(next) =>
								void setParams({ series: next.length > 0 ? next : null })
							}
						/>
						<AuthorFilterDateRange
							legend="Finished reading between"
							from={params.finishedFrom}
							to={params.finishedTo}
							minYear={1990}
							onChange={({ from, to }) =>
								void setParams({ finishedFrom: from, finishedTo: to })
							}
						/>
						<AuthorFilterDateRange
							legend="Logged in the app between"
							from={params.loggedFrom}
							to={params.loggedTo}
							onChange={({ from, to }) =>
								void setParams({ loggedFrom: from, loggedTo: to })
							}
						/>
						<AuthorFilterBooks
							slug={slug}
							params={params}
							setParams={setParams}
							idPrefix="author-reads"
						/>
					</>
				}
				activeCount={activeCount}
				onClearAll={clearAll}
				chips={chips}
				resultLabel={resultLabel}
			/>

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
					filtered ? (
						<AuthorFilteredEmpty
							filtered
							emptyText=""
							filteredText="No reads match these filters."
							onClear={clearAll}
						/>
					) : (
						<AuthorTabEmptyContent
							authorSlug={slug}
							text={`No one has finished a book by ${authorName} yet.`}
						/>
					)
				}
				loadingContent={<ReadsSkeleton compact={compact} />}
				endMessage="That is every read."
			>
				{compact ? (
					<div className="flex flex-col border border-border bg-card">
						{items.map((item) => (
							<ReadRow
								key={`${item.member.username}:${item.book.slug}`}
								item={item}
							/>
						))}
					</div>
				) : (
					<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{items.map((item) => (
							<li key={`${item.member.username}:${item.book.slug}`}>
								<ReadCard item={item} />
							</li>
						))}
					</ul>
				)}
			</InfiniteScroll>
		</div>
	);
}
