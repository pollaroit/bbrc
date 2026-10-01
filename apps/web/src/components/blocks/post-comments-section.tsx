"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CommentListItemView } from "@/components/blocks/comment-list-item";
import { PostCommentForm } from "@/components/blocks/post-comment-form";
import { orpc } from "@/utils/orpc";

type PostCommentsSectionProps = {
	postSlug: string;
};

const COMMENT_PAGE_SIZE = 15;

function CommentsListSkeleton() {
	return (
		<div className="flex flex-col gap-3" aria-hidden>
			{Array.from({ length: 3 }, (_, index) => (
				<Skeleton key={index} className="h-28 w-full" />
			))}
		</div>
	);
}

export function PostCommentsSection({ postSlug }: PostCommentsSectionProps) {
	const router = useRouter();

	const query = useInfiniteQuery(
		orpc.comment.getCommentList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				postSlug,
				limit: COMMENT_PAGE_SIZE,
				sortBy: "createdAt",
				sortDirection: "asc",
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const comments = query.data?.pages.flatMap((page) => page.items) ?? [];

	return (
		<section
			id="comments"
			aria-labelledby="post-comments-heading"
			className="flex scroll-mt-20 flex-col gap-4"
		>
			<h2 id="post-comments-heading" className="font-semibold text-lg">
				Comments
			</h2>

			<PostCommentForm
				postSlug={postSlug}
				onCommentCreated={() => {
					router.refresh();
				}}
			/>

			<InfiniteScroll
				className="flex flex-col gap-3"
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
				isEmpty={comments.length === 0}
				emptyTitle="No comments yet"
				emptyDescription="Start the conversation with a comment above."
				loadingContent={<CommentsListSkeleton />}
				endMessage="End of comments."
			>
				<ul className="flex flex-col gap-3">
					{comments.map((comment) => (
						<li key={comment.slug}>
							<CommentListItemView
								comment={comment}
								variant="full"
								postSlug={postSlug}
							/>
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</section>
	);
}
