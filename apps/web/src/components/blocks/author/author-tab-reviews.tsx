"use client";

import type { AuthorReviewItem } from "@bbrc/api/modules/author/author.schema";
import type { Formatters } from "@bbrc/i18n";
import { formatFeedbackRating } from "@bbrc/shared";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Field,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@bbrc/ui/components/field";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@bbrc/ui/components/toggle-group";
import { useInfiniteQuery } from "@tanstack/react-query";
import { EyeOff, Heart, ImageIcon, MessageCircle, Star } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import {
	AuthorFilterBar,
	type AuthorFilterChip,
	AuthorFilteredEmpty,
} from "@/components/blocks/author/author-filter-bar";
import {
	AuthorFilterBooks,
	useAuthorBookFilterChips,
} from "@/components/blocks/author/author-filter-books";
import { AuthorFilterDateRange } from "@/components/blocks/author/author-filter-date-range";
import {
	AuthorFilterBooksPicker,
	AuthorFilterMembers,
	AuthorFilterSeries,
} from "@/components/blocks/author/author-filter-multi-select";
import { AuthorTabEmptyContent } from "@/components/blocks/author/author-tab-shell";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { ListingRatingRangeFields } from "@/components/listing/listing-rating-range-fields";
import { ListingSort } from "@/components/listing/listing-sort";
import { Link } from "@/i18n/navigation";
import {
	bookCoverFrameClassName,
	bookCoverUrl,
	formatBookSeriesCardLabel,
} from "@/lib/book-cover";
import { useFormatters } from "@/lib/i18n/use-formatters";
import {
	AUTHOR_BOOK_FILTER_RESET,
	authorReviewSortFields,
	authorReviewSortLabels,
	countAuthorBookFilters,
	toAuthorReviewsInput,
	useAuthorReviewsParams,
	useDebouncedValue,
} from "@/lib/listing/author-activity-listing";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const LIMIT = 12;

function humanize(slug: string) {
	return slug
		.split("-")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function shortDate(f: Formatters, date: Date) {
	return f.dateWith(date, { year: "numeric", month: "short", day: "numeric" });
}

/** Five stars, filled to the rating (half steps), with the number beside it. */
function RatingStars({ rating }: { rating: number }) {
	return (
		<span
			className="inline-flex shrink-0 items-center gap-1.5"
			role="img"
			aria-label={`Rated ${formatFeedbackRating(rating)} out of 5`}
		>
			<span className="relative inline-flex" aria-hidden>
				<span className="inline-flex text-muted-foreground/40">
					{Array.from({ length: 5 }, (_, index) => (
						<Star key={index} className="size-3.5" />
					))}
				</span>
				<span
					className="absolute inset-y-0 left-0 inline-flex overflow-hidden text-warning"
					style={{ width: `${Math.max(0, Math.min(5, rating)) * 20}%` }}
				>
					{Array.from({ length: 5 }, (_, index) => (
						<Star key={index} className="size-3.5 shrink-0 fill-current" />
					))}
				</span>
			</span>
			<span className="font-semibold text-sm tabular-nums">
				{formatFeedbackRating(rating)}
			</span>
		</span>
	);
}

function ReviewCard({ item }: { item: AuthorReviewItem }) {
	const href = `/books/${item.book.slug}/feedbacks/${item.slug}` as Route;
	const coverSrc = bookCoverUrl(item.book.coverId, "S");
	const series = item.series;

	return (
		<article className="relative flex h-full flex-col border border-border bg-card transition-colors hover:bg-muted/20">
			<Link
				href={href}
				className="absolute inset-0 z-0"
				aria-label={`Open ${item.member.name}'s review of ${item.book.title}`}
			/>

			<div className="relative z-10 flex items-start justify-between gap-3 px-4 pt-4">
				<Link
					href={`/users/${item.member.username}` as Route}
					className="flex min-w-0 items-center gap-2.5 outline-offset-2"
				>
					<UserAvatar user={item.member} className="size-9" />
					<span className="min-w-0">
						<span className="block truncate font-medium text-sm leading-tight">
							{item.member.name}
						</span>
						<RelativeTime
							date={item.createdAt}
							className="block text-muted-foreground text-xs"
						/>
					</span>
				</Link>
				<RatingStars rating={item.rating} />
			</div>

			<div className="relative z-10 flex min-w-0 items-center gap-3 px-4 pt-3">
				<Link
					href={`/books/${item.book.slug}` as Route}
					tabIndex={-1}
					aria-hidden
					className={cn(
						"relative block aspect-2/3 w-8 shrink-0",
						bookCoverFrameClassName,
					)}
				>
					{coverSrc ? (
						<Image
							src={coverSrc}
							alt=""
							fill
							className="object-cover"
							sizes="32px"
						/>
					) : null}
				</Link>
				<div className="min-w-0">
					<Link
						href={`/books/${item.book.slug}` as Route}
						className="line-clamp-1 font-medium text-sm hover:underline"
					>
						{item.book.title}
					</Link>
					{series ? (
						<p className="line-clamp-1 text-muted-foreground text-xs">
							{formatBookSeriesCardLabel(series)}
						</p>
					) : null}
				</div>
			</div>

			<div className="relative z-10 flex flex-1 px-4 py-3">
				{item.isSpoiler ? (
					<p className="inline-flex items-center gap-2 text-muted-foreground text-sm italic">
						<EyeOff className="size-4 shrink-0" aria-hidden />
						Contains spoilers. Open the review to read it.
					</p>
				) : item.excerpt ? (
					<p className="line-clamp-6 text-sm leading-relaxed">{item.excerpt}</p>
				) : (
					<p className="text-muted-foreground text-sm italic">
						Rating only, no written review.
					</p>
				)}
			</div>

			<div className="relative z-10 mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-border border-t bg-muted/20 px-4 py-2 text-muted-foreground text-xs tabular-nums">
				<span className="inline-flex items-center gap-1" title="Likes">
					<Heart className="size-3.5" aria-hidden />
					{item.likeCount}
				</span>
				<span className="inline-flex items-center gap-1" title="Comments">
					<MessageCircle className="size-3.5" aria-hidden />
					{item.commentCount}
				</span>
				{item.hasImage ? (
					<span className="inline-flex items-center gap-1">
						<ImageIcon className="size-3.5" aria-hidden />
						Image
					</span>
				) : null}
			</div>
		</article>
	);
}

function ReviewsSkeleton() {
	return (
		<div
			className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
			aria-hidden
		>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-60 w-full" />
			))}
		</div>
	);
}

export function AuthorTabReviews({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const f = useFormatters();
	const [params, setParams] = useAuthorReviewsParams();
	const search = useDebouncedValue(params.search);

	const input = toAuthorReviewsInput(slug, params, search);
	const query = useInfiniteQuery(
		orpc.author.reviews.infiniteOptions({
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
		(params.minRating != null || params.maxRating != null ? 1 : 0) +
		(params.reviewType ? 1 : 0) +
		(params.hasImage === true ? 1 : 0) +
		(params.spoilers ? 1 : 0) +
		(params.createdFrom || params.createdTo ? 1 : 0) +
		countAuthorBookFilters(params);
	const filtered = activeCount > 0 || Boolean(params.search?.trim());

	const clearAll = () => {
		void setParams({
			search: null,
			members: null,
			books: null,
			series: null,
			minRating: null,
			maxRating: null,
			reviewType: null,
			hasImage: null,
			spoilers: null,
			createdFrom: null,
			createdTo: null,
			...AUTHOR_BOOK_FILTER_RESET,
		});
	};

	const withoutValue = (list: string[] | null, value: string) => {
		const next = (list ?? []).filter((item) => item !== value);
		return next.length > 0 ? next : null;
	};

	const ratingChip: AuthorFilterChip[] =
		params.minRating != null || params.maxRating != null
			? [
					{
						id: "rating",
						label:
							params.minRating != null && params.maxRating != null
								? `Rated ${params.minRating}–${params.maxRating}`
								: params.minRating != null
									? `Rated ${params.minRating}+`
									: `Rated up to ${params.maxRating}`,
						onRemove: () =>
							void setParams({ minRating: null, maxRating: null }),
					},
				]
			: [];

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
		...ratingChip,
		...(params.reviewType
			? [
					{
						id: "type",
						label:
							params.reviewType === "written" ? "With text" : "Rating only",
						onRemove: () => void setParams({ reviewType: null }),
					},
				]
			: []),
		...(params.hasImage === true
			? [
					{
						id: "image",
						label: "Has an image",
						onRemove: () => void setParams({ hasImage: null }),
					},
				]
			: []),
		...(params.spoilers
			? [
					{
						id: "spoilers",
						label: params.spoilers === "only" ? "Spoilers only" : "No spoilers",
						onRemove: () => void setParams({ spoilers: null }),
					},
				]
			: []),
		...(params.createdFrom || params.createdTo
			? [
					{
						id: "written",
						label: `Written ${params.createdFrom ? shortDate(f, params.createdFrom) : "…"} – ${params.createdTo ? shortDate(f, params.createdTo) : "…"}`,
						onRemove: () =>
							void setParams({ createdFrom: null, createdTo: null }),
					},
				]
			: []),
		...useAuthorBookFilterChips(params, setParams),
	];

	const resultLabel =
		total == null
			? null
			: `${f.number(total)} ${total === 1 ? "review" : "reviews"}${filtered ? " match" : ""}`;

	return (
		<div className="flex flex-col gap-4">
			<AuthorFilterBar
				search={params.search}
				onSearchChange={(value) => void setParams({ search: value })}
				searchPlaceholder="Search reviews, reviewers or books…"
				sort={
					<ListingSort
						sortBy={params.sortBy ?? "createdAt"}
						sortDirection={params.sortDirection ?? "desc"}
						onSortByChange={(sortBy) => void setParams({ sortBy })}
						onSortDirectionChange={(sortDirection) =>
							void setParams({ sortDirection })
						}
						sortByOptions={authorReviewSortFields}
						sortByLabels={authorReviewSortLabels}
					/>
				}
				sheetTitle="Review filters"
				sheetDescription={`Narrow down the reviews of books by ${authorName}.`}
				sheetContent={
					<>
						<AuthorFilterMembers
							slug={slug}
							source="reviews"
							label="Reviewers"
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

						<ListingRatingRangeFields
							legend="Rating given"
							minId="author-reviews-min-rating"
							maxId="author-reviews-max-rating"
							step={0.5}
							min={params.minRating}
							max={params.maxRating}
							onMinChange={(minRating) => void setParams({ minRating })}
							onMaxChange={(maxRating) => void setParams({ maxRating })}
						/>

						<FieldSet className="gap-2">
							<FieldLegend>Kind of review</FieldLegend>
							<ToggleGroup
								value={[params.reviewType ?? "any"]}
								onValueChange={(value) => {
									const next = value[0];
									void setParams({
										reviewType:
											next === "written" || next === "rating_only"
												? next
												: null,
									});
								}}
								variant="outline"
								size="sm"
								className="flex-wrap"
								aria-label="Kind of review"
							>
								<ToggleGroupItem value="any">Any</ToggleGroupItem>
								<ToggleGroupItem value="written">With text</ToggleGroupItem>
								<ToggleGroupItem value="rating_only">
									Rating only
								</ToggleGroupItem>
							</ToggleGroup>
						</FieldSet>

						<FieldSet className="gap-2">
							<FieldLegend>Spoilers</FieldLegend>
							<ToggleGroup
								value={[params.spoilers ?? "any"]}
								onValueChange={(value) => {
									const next = value[0];
									void setParams({
										spoilers: next === "only" || next === "hide" ? next : null,
									});
								}}
								variant="outline"
								size="sm"
								className="flex-wrap"
								aria-label="Spoilers"
							>
								<ToggleGroupItem value="any">Show all</ToggleGroupItem>
								<ToggleGroupItem value="hide">Hide spoilers</ToggleGroupItem>
								<ToggleGroupItem value="only">Spoilers only</ToggleGroupItem>
							</ToggleGroup>
						</FieldSet>

						<Field orientation="horizontal" className="gap-0">
							<FieldLabel className="w-full gap-3 border border-border px-4 py-3">
								<Checkbox
									checked={params.hasImage === true}
									onCheckedChange={(value) =>
										void setParams({ hasImage: value === true ? true : null })
									}
								/>
								<FieldTitle className="text-foreground text-sm">
									Only reviews with an image
								</FieldTitle>
							</FieldLabel>
						</Field>

						<AuthorFilterDateRange
							legend="Written between"
							from={params.createdFrom}
							to={params.createdTo}
							onChange={({ from, to }) =>
								void setParams({ createdFrom: from, createdTo: to })
							}
						/>

						<AuthorFilterBooks
							slug={slug}
							params={params}
							setParams={setParams}
							idPrefix="author-reviews"
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
							filteredText="No reviews match these filters."
							onClear={clearAll}
						/>
					) : (
						<AuthorTabEmptyContent
							authorSlug={slug}
							text={`No one has reviewed a book by ${authorName} yet — be the first.`}
							linkLabel="Pick a book to review"
						/>
					)
				}
				loadingContent={<ReviewsSkeleton />}
				endMessage="That is every review."
			>
				<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{items.map((item) => (
						<li key={item.slug}>
							<ReviewCard item={item} />
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
