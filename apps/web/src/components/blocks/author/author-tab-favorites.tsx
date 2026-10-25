"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
	AuthorTabBookLine,
	AuthorTabEmptyContent,
	AuthorTabHeading,
	AuthorTabSkeleton,
	authorTabGridClassName,
} from "@/components/blocks/author/author-tab-shell";
import { ClubDateTime } from "@/components/blocks/club-date-time";
import { UserPanel } from "@/components/blocks/user-panel";
import { orpc } from "@/utils/orpc";

const LIMIT = 24;

export function AuthorTabFavorites({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const query = useInfiniteQuery(
		orpc.author.favorites.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (last) => last.members.metadata.nextCursor ?? undefined,
			input: (cursor) => ({
				slug,
				limit: LIMIT,
				...(cursor != null ? { cursor } : {}),
			}),
		}),
	);

	const first = query.data?.pages[0];
	const members = query.data?.pages.flatMap((page) => page.members.items) ?? [];

	if (first && first.totalFavorites === 0) {
		return (
			<AuthorTabEmptyContent
				authorSlug={slug}
				text={`No one has put a book by ${authorName} among their favorites yet.`}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			{first ? (
				<section aria-labelledby="author-favorite-books" className="space-y-3">
					<div id="author-favorite-books">
						<AuthorTabHeading title="Most favorited books">
							{first.totalFavorites}{" "}
							{first.totalFavorites === 1 ? "favorite" : "favorites"} from{" "}
							{first.memberCount}{" "}
							{first.memberCount === 1 ? "member" : "members"}
						</AuthorTabHeading>
					</div>
					<ul className={authorTabGridClassName}>
						{first.books.map(({ book, count }) => (
							<li
								key={book.slug}
								className="flex items-center justify-between gap-3 border border-border p-3"
							>
								<AuthorTabBookLine book={book} hideAuthors />
								<span className="inline-flex shrink-0 items-center gap-1 text-sm tabular-nums">
									<Heart className="size-4 text-pink" aria-hidden />
									{count}
								</span>
							</li>
						))}
					</ul>
				</section>
			) : null}

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
					emptyTitle="No members to show"
					emptyDescription="Members who keep their favorites private are not listed."
					loadingContent={<AuthorTabSkeleton count={3} />}
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
								<ul className="flex flex-col gap-2">
									{item.books.map((book) => (
										<li key={book.slug}>
											<AuthorTabBookLine book={book} hideAuthors />
										</li>
									))}
								</ul>
								<p className="mt-auto text-muted-foreground text-xs">
									Favorited <ClubDateTime value={item.favoritedAt} />
								</p>
							</li>
						))}
					</ul>
				</InfiniteScroll>
			</section>
		</div>
	);
}
