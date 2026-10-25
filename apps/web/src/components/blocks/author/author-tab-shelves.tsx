"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
	AuthorTabEmptyContent,
	AuthorTabSkeleton,
	authorTabGridClassName,
} from "@/components/blocks/author/author-tab-shell";
import { ShelfCatalogCard } from "@/components/blocks/shelf-catalog-card";
import { orpc } from "@/utils/orpc";

const LIMIT = 12;

export function AuthorTabShelves({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const query = useInfiniteQuery(
		orpc.author.shelves.infiniteOptions({
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
					text={`No public shelf holds a book by ${authorName} yet.`}
				/>
			}
			loadingContent={<AuthorTabSkeleton count={3} />}
			endMessage="That is every shelf."
		>
			<ul className={authorTabGridClassName}>
				{items.map((shelf) => (
					<li
						key={`${shelf.owner.username}/${shelf.slug}`}
						className="flex flex-col gap-1.5"
					>
						<ShelfCatalogCard
							className="flex-1"
							impressionSource="other"
							shelf={{
								...shelf,
								owner: { ...shelf.owner, image: shelf.owner.image ?? null },
								collaborators: [],
								collaboratorCount: 0,
							}}
						/>
						<p className="text-muted-foreground text-xs tabular-nums">
							{shelf.authorBookCount} of {shelf.bookCount}{" "}
							{shelf.bookCount === 1 ? "book is" : "books are"} by {authorName}
						</p>
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
