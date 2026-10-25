"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import {
	AuthorTabBookLine,
	AuthorTabEmptyContent,
	AuthorTabSkeleton,
	authorTabGridClassName,
} from "@/components/blocks/author/author-tab-shell";
import { ClubDateTime } from "@/components/blocks/club-date-time";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { BOOK_SITTING_OUTCOME_LABELS } from "@/lib/book-sittings";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const LIMIT = 12;

const outcomeClassName = {
	picked: "border-success/30 bg-success/10 text-success-ink",
	in_poll: "border-warning/30 bg-warning/10 text-warning-ink",
	not_picked: "text-muted-foreground",
} as const;

const outcomeLead = {
	picked: "Picked",
	in_poll: "In the poll",
	not_picked: "Not picked",
} as const;

export function AuthorTabSittings({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const query = useInfiniteQuery(
		orpc.author.sittings.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (last) => last.metadata.nextCursor ?? undefined,
			input: (cursor) => ({
				slug,
				limit: LIMIT,
				...(cursor != null ? { cursor } : {}),
			}),
		}),
	);
	const items = query.data?.pages.flatMap((page) => page.items) ?? [];

	return (
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
					text={`No sitting has had a book by ${authorName} in play yet.`}
				/>
			}
			loadingContent={<AuthorTabSkeleton count={3} />}
			endMessage="That is every sitting."
		>
			<ul className={authorTabGridClassName}>
				{items.map((item) => (
					<li
						key={item.slug}
						className="relative flex h-full flex-col gap-3 border border-border p-4 transition-colors hover:bg-muted/40"
					>
						<div className="flex flex-wrap items-center gap-2">
							<SittingStatusBadge status={item.status} />
							<Badge
								variant="outline"
								className={cn(outcomeClassName[item.outcome])}
							>
								{BOOK_SITTING_OUTCOME_LABELS[item.outcome]}
							</Badge>
						</div>

						<h3 className="font-medium text-sm leading-snug">
							<Link
								href={`/sittings/${item.slug}` as Route}
								className="after:absolute after:inset-0"
							>
								{item.displayName}
							</Link>
						</h3>

						<ul className="relative z-10 flex flex-col gap-2">
							{item.books.map((book) => (
								<li key={book.slug}>
									<AuthorTabBookLine book={book} hideAuthors />
								</li>
							))}
						</ul>

						{item.outcome === "not_picked" && item.pickedBook ? (
							<p className="text-muted-foreground text-xs">
								The club picked{" "}
								<Link
									href={`/books/${item.pickedBook.slug}` as Route}
									className="relative z-10 underline underline-offset-4 hover:text-foreground"
								>
									{item.pickedBook.title}
								</Link>{" "}
								instead.
							</p>
						) : null}

						<div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
							<span>
								{outcomeLead[item.outcome]} <ClubDateTime value={item.date} />
							</span>
							{item.outcome === "picked" ? (
								<span>
									{item.completedCount} of {item.participantCount} finished
								</span>
							) : null}
						</div>
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
