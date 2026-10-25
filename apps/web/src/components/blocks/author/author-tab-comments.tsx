"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CornerDownRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
	AuthorTabEmptyContent,
	AuthorTabSkeleton,
} from "@/components/blocks/author/author-tab-shell";
import { CommentListItemView } from "@/components/blocks/comment-list-item";
import { orpc } from "@/utils/orpc";

const LIMIT = 10;

export function AuthorTabComments({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const query = useInfiniteQuery(
		orpc.author.comments.infiniteOptions({
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
			className="flex flex-col gap-4"
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
					text={`No comments yet on posts that mention ${authorName}.`}
					linkLabel="See the posts"
					href={`/authors/${slug}/posts` as Route}
				/>
			}
			loadingContent={<AuthorTabSkeleton variant="rows" count={4} />}
			endMessage="That is every comment."
		>
			<ul className="flex flex-col gap-4">
				{items.map((comment) => (
					<li key={comment.slug} className="flex flex-col gap-1.5">
						{comment.post ? (
							<Link
								href={`/posts/${comment.post.slug}` as Route}
								className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground"
							>
								<CornerDownRight className="size-3.5 shrink-0" aria-hidden />
								<span className="shrink-0">On the post</span>
								<span className="truncate">{comment.post.excerpt}</span>
							</Link>
						) : null}
						<CommentListItemView
							comment={comment}
							variant="full"
							layout="card"
							postSlug={comment.post?.slug}
						/>
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
