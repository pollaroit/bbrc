"use client";

import type { GetBookmarkListOutput } from "@bbrc/api/modules/bookmark/bookmark.schema";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { UserPanel } from "@/components/blocks/user-panel";
import { formatDateTime } from "@/lib/format-datetime";
import { client, orpc } from "@/utils/orpc";

type BookmarkMarkDialogListProps = {
	postSlug?: string;
	commentSlug?: string;
	enabled: boolean;
};

type BookmarkListPage = GetBookmarkListOutput;

function bookmarkListBaseInput(postSlug?: string, commentSlug?: string) {
	if (postSlug) {
		return {
			postSlug,
			limit: 20,
			sortBy: "bookmarkedAt" as const,
			sortDirection: "desc" as const,
		};
	}
	return {
		commentSlug: commentSlug!,
		limit: 20,
		sortBy: "bookmarkedAt" as const,
		sortDirection: "desc" as const,
	};
}

function BookmarkMarkDialogListBody({
	query,
}: {
	query: {
		data: InfiniteData<BookmarkListPage> | undefined;
		hasNextPage: boolean;
		isFetchingNextPage: boolean;
		fetchNextPage: () => void;
		isPending: boolean;
		isError: boolean;
		error: Error | null;
		refetch: () => void;
	};
}) {
	const entries = query.data?.pages.flatMap((page) => page.items) ?? [];

	return (
		<InfiniteScroll
			className="flex flex-col gap-2"
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
			isEmpty={entries.length === 0}
			emptyTitle="No bookmarks yet"
			emptyDescription="When someone saves this, they will show up here."
			loadingContent={
				<div className="flex flex-col gap-2" aria-hidden>
					{Array.from({ length: 4 }, (_, index) => (
						<Skeleton key={index} className="h-12 w-full" />
					))}
				</div>
			}
			endMessage="End of list."
		>
			<ul className="flex flex-col gap-2">
				{entries.map((entry) => (
					<li key={`${entry.user.username}-${entry.bookmarkedAt.toString()}`}>
						<Link
							href={`/users/${entry.user.username}` as Route}
							className="flex items-center justify-between gap-3 border px-3 py-2 transition-colors hover:bg-muted/40"
						>
							<UserPanel user={entry.user} className="min-w-0" />
							<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
								{formatDateTime(entry.bookmarkedAt)}
							</span>
						</Link>
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}

function useBookmarkMarkListQuery(
	postSlug: string | undefined,
	commentSlug: string | undefined,
	enabled: boolean,
) {
	const base = bookmarkListBaseInput(postSlug, commentSlug);

	return useInfiniteQuery<
		BookmarkListPage,
		Error,
		InfiniteData<BookmarkListPage>,
		readonly unknown[],
		string | undefined
	>({
		queryKey: orpc.bookmark.listMarks.key({ input: base }),
		initialPageParam: undefined,
		getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
		queryFn: ({ pageParam }) =>
			client.bookmark.listMarks({
				...base,
				...(pageParam != null ? { cursor: pageParam } : {}),
			}),
		enabled: enabled && Boolean(postSlug ?? commentSlug),
	});
}

export function BookmarkMarkDialogList({
	postSlug,
	commentSlug,
	enabled,
}: BookmarkMarkDialogListProps) {
	const query = useBookmarkMarkListQuery(postSlug, commentSlug, enabled);
	return <BookmarkMarkDialogListBody query={query} />;
}
