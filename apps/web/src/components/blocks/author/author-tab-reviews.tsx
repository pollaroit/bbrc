"use client";

import { formatFeedbackRating } from "@bbrc/shared";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@bbrc/ui/components/select";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Heart, ImageIcon, MessageCircle, Star } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
	AuthorTabBookLine,
	AuthorTabEmptyContent,
	AuthorTabSkeleton,
	authorTabGridClassName,
} from "@/components/blocks/author/author-tab-shell";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserPanel } from "@/components/blocks/user-panel";
import { orpc } from "@/utils/orpc";

const LIMIT = 12;

const SORTS = {
	newest: { label: "Newest", sortBy: "createdAt", sortDirection: "desc" },
	highest: { label: "Highest rated", sortBy: "rating", sortDirection: "desc" },
	lowest: { label: "Lowest rated", sortBy: "rating", sortDirection: "asc" },
} as const;

const sortKeys = Object.keys(SORTS) as (keyof typeof SORTS)[];

export function AuthorTabReviews({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const [sort, setSort] = useQueryState(
		"sort",
		parseAsStringLiteral(sortKeys).withDefault("newest"),
	);
	const { sortBy, sortDirection } = SORTS[sort];

	const query = useInfiniteQuery(
		orpc.author.reviews.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (last) => last.metadata.nextCursor ?? undefined,
			input: (cursor) => ({
				slug,
				limit: LIMIT,
				sortBy,
				sortDirection,
				...(cursor != null ? { cursor } : {}),
			}),
		}),
	);
	const items = query.data?.pages.flatMap((page) => page.items) ?? [];
	const total = query.data?.pages[0]?.metadata.total;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-muted-foreground text-sm tabular-nums">
					{total != null
						? `${total} ${total === 1 ? "review" : "reviews"} of books by ${authorName}`
						: " "}
				</p>
				<Select
					value={sort}
					onValueChange={(value) => {
						void setSort(value as keyof typeof SORTS);
					}}
				>
					<SelectTrigger aria-label="Sort reviews" className="h-8 w-44">
						{SORTS[sort].label}
					</SelectTrigger>
					<SelectContent>
						{sortKeys.map((key) => (
							<SelectItem key={key} value={key}>
								{SORTS[key].label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
				isEmpty={items.length === 0}
				emptyContent={
					<AuthorTabEmptyContent
						authorSlug={slug}
						text={`No one has reviewed a book by ${authorName} yet — be the first.`}
						linkLabel="Pick a book to review"
					/>
				}
				loadingContent={<AuthorTabSkeleton count={4} />}
				endMessage="That is every review."
			>
				<ul className={authorTabGridClassName}>
					{items.map((item) => {
						const href =
							`/books/${item.book.slug}/feedbacks/${item.slug}` as Route;
						return (
							<li
								key={item.slug}
								className="relative flex h-full flex-col gap-3 border border-border p-4 transition-colors hover:bg-muted/40"
							>
								<Link
									href={href}
									className="absolute inset-0 z-0"
									aria-label={`Open ${item.member.name}'s review of ${item.book.title}`}
								/>
								<div className="relative z-10 flex items-start justify-between gap-3">
									<Link
										href={`/users/${item.member.username}` as Route}
										className="min-w-0 outline-offset-2"
									>
										<UserPanel user={item.member} className="min-w-0" />
									</Link>
									<span className="inline-flex shrink-0 items-center gap-1 border border-border px-1.5 py-0.5 font-medium text-xs tabular-nums">
										<Star
											className="size-3.5 fill-warning text-warning"
											aria-hidden
										/>
										{formatFeedbackRating(item.rating)}
									</span>
								</div>

								<AuthorTabBookLine
									book={item.book}
									hideAuthors
									className="relative z-10"
								/>

								{item.isSpoiler ? (
									<p className="text-muted-foreground text-sm italic">
										Contains spoilers. Open the review to read it.
									</p>
								) : item.excerpt ? (
									<p className="line-clamp-5 text-sm leading-relaxed">
										{item.excerpt}
									</p>
								) : (
									<p className="text-muted-foreground text-sm italic">
										Rating only, no written review.
									</p>
								)}

								<div className="relative z-10 mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
									<RelativeTime
										date={item.createdAt}
										className="text-muted-foreground text-xs"
									/>
									<span className="inline-flex items-center gap-1">
										<Heart className="size-3.5" aria-hidden />
										{item.likeCount}
									</span>
									<span className="inline-flex items-center gap-1">
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
							</li>
						);
					})}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
