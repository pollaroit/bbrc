"use client";

import { formatReadFinishedMonth } from "@bbrc/shared";
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
import { EditionChip } from "@/components/blocks/edition-chip";
import { UserPanel } from "@/components/blocks/user-panel";
import { orpc } from "@/utils/orpc";

const LIMIT = 24;

function finishedLabel(year: number | null, month: number | null) {
	if (year != null && month != null) {
		return `Finished ${formatReadFinishedMonth({ year, month })}`;
	}
	if (year != null) return `Finished in ${year}`;
	return "Finish date not set";
}

export function AuthorTabReads({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const query = useInfiniteQuery(
		orpc.author.reads.infiniteOptions({
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
					text={`No one has finished a book by ${authorName} yet.`}
				/>
			}
			loadingContent={<AuthorTabSkeleton />}
			endMessage="That is every read."
		>
			<ul className={authorTabGridClassName}>
				{items.map((item) => (
					<li
						key={`${item.member.username}:${item.book.slug}`}
						className="flex h-full flex-col gap-3 border border-border p-4"
					>
						<Link
							href={`/users/${item.member.username}` as Route}
							className="min-w-0 outline-offset-2"
						>
							<UserPanel user={item.member} className="min-w-0" />
						</Link>
						<AuthorTabBookLine book={item.book} hideAuthors />
						<div className="mt-auto flex min-w-0 flex-col items-start gap-1.5">
							<p className="text-muted-foreground text-sm">
								{finishedLabel(item.finishedYear, item.finishedMonth)}
							</p>
							<EditionChip
								bookSlug={item.book.slug}
								edition={item.edition}
								prefix="Read the"
							/>
						</div>
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
