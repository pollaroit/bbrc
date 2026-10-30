"use client";

import type { GetPostListOutput } from "@bbrc/api/modules/post/post.schema";
import { contentPlainText, type ViewSourceName } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { CornerDownRight, MessageCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { CommentListItemView } from "@/components/blocks/comment-list-item";
import { PostAttachedImage } from "@/components/blocks/post-attached-image";
import { PostAttachmentCard } from "@/components/blocks/post-attachment-card";
import { PostCommentForm } from "@/components/blocks/post-comment-form";
import { PostLikeEngagement } from "@/components/blocks/post-like-engagement";
import { PostOwnerMenu } from "@/components/blocks/post-owner-menu";
import { PostPoll } from "@/components/blocks/post-poll";
import { PostTierlistSection } from "@/components/blocks/post-tierlist";
import { PostViewsAction } from "@/components/blocks/post-views-action";
import { RelativeTime } from "@/components/blocks/relative-time";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { SocialContentBody } from "@/components/blocks/social-content-body";
import { useImpressionRef } from "@/components/blocks/track-impression";
import { UserPanel } from "@/components/blocks/user-panel";
import { VisibilityBadge } from "@/components/blocks/visibility-select";
import { isPendingSlug } from "@/lib/optimistic/infinite-lists";
import { shareSnippet } from "@/lib/share-snippet";
import { cn } from "@/lib/utils";

export type PostCardPost = GetPostListOutput["items"][number];

type PostCardProps = {
	post: PostCardPost;
	className?: string;
	/** Where the card is listed, for view counts. */
	impressionSource?: ViewSourceName;
	/** Public opens of the post, when known. */
	viewCount?: number;
};

/** Comments under a post in the feed: a peek, a quick reply, and the way to the full thread. */
function PostCardComments({ post }: { post: PostCardPost }) {
	const postHref = `/posts/${post.slug}` as Route;
	const [open, setOpen] = useState(false);
	const [replyingTo, setReplyingTo] = useState<string | null>(null);
	const shown = open ? post.topComments : post.topComments.slice(0, 1);
	const hidden = post.commentCount - shown.length;

	if (!post.allowComments && post.commentCount === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-3 border-border border-t bg-muted/20 px-4 py-3">
			{shown.length > 0 ? (
				<ul className="flex flex-col divide-y divide-border/60">
					{shown.map((comment) => (
						<li key={comment.slug} className="py-2.5 first:pt-0 last:pb-0">
							<CommentListItemView
								comment={comment}
								variant="compact"
								layout="thread"
								postSlug={post.slug}
								canReply={post.allowComments && !isPendingSlug(comment.slug)}
								onReply={() => setReplyingTo(comment.slug)}
							/>
							{comment.replyCount > 0 && comment.latestReply ? (
								<div className="ms-8 mt-2 flex flex-col gap-1.5 border-border border-s-2 ps-3">
									<p className="flex items-center gap-2 text-2xs text-muted-foreground">
										<CornerDownRight className="size-3" aria-hidden />
										<span>Latest reply</span>
										<Link
											href={
												`/posts/${post.slug}/comments/${comment.slug}` as Route
											}
											className="font-medium text-foreground underline-offset-4 hover:underline"
										>
											{comment.replyCount === 1
												? "1 reply"
												: `View all ${comment.replyCount} replies`}
										</Link>
									</p>
									<CommentListItemView
										comment={{
											...comment.latestReply,
											replyCount: 0,
											latestReply: null,
										}}
										variant="compact"
										layout="thread"
										postSlug={post.slug}
									/>
								</div>
							) : null}
							{replyingTo === comment.slug ? (
								<div className="mt-2 ps-8">
									<PostCommentForm
										postSlug={post.slug}
										parentSlug={comment.slug}
										replyToUsername={comment.author.username}
										replyToName={comment.author.name}
										compact
										onCancelReply={() => setReplyingTo(null)}
										onSubmitted={() => setReplyingTo(null)}
										onSubmitFailed={() => setReplyingTo(comment.slug)}
									/>
								</div>
							) : null}
						</li>
					))}
				</ul>
			) : null}

			{post.allowComments ? (
				open ? (
					<PostCommentForm
						postSlug={post.slug}
						compact
						autoFocus
						onCommentCreated={() => setOpen(false)}
					/>
				) : (
					<button
						type="button"
						onClick={() => setOpen(true)}
						className="flex items-center gap-2 border border-border bg-background px-3 py-2 text-start text-muted-foreground text-sm transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
					>
						<MessageCircle className="size-4" aria-hidden />
						Write a comment…
					</button>
				)
			) : (
				<p className="text-muted-foreground text-xs">
					Comments are turned off for this post.
				</p>
			)}

			{hidden > 0 ? (
				<Link
					href={`${postHref}#comments` as Route}
					className="w-fit text-muted-foreground text-xs underline-offset-4 transition-colors hover:text-foreground hover:underline"
				>
					View all {post.commentCount} comments
				</Link>
			) : null}
		</div>
	);
}

function PostCardInner({
	post,
	className,
	impressionSource = "feed",
	viewCount,
}: PostCardProps) {
	const postHref = `/posts/${post.slug}` as Route;
	const countImpression = useImpressionRef(
		"post",
		isPendingSlug(post.slug) ? null : post.slug,
		impressionSource,
	);

	return (
		<article
			ref={countImpression}
			className={cn(
				"flex flex-col overflow-hidden border border-border bg-card",
				className,
			)}
		>
			<header className="flex items-start justify-between gap-3 px-4 pt-4">
				<Link
					href={`/users/${post.author.username}` as Route}
					className="min-w-0 outline-offset-2"
				>
					<UserPanel user={post.author} className="min-w-0 items-start" />
				</Link>
				<div className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs">
					<VisibilityBadge level={post.visibility} />
					<Link
						href={postHref}
						className="transition-colors hover:text-foreground"
					>
						<RelativeTime
							date={post.createdAt}
							className="text-muted-foreground text-xs"
						/>
						{post.editedAt ? <span className="ps-1">· edited</span> : null}
					</Link>
					<PostOwnerMenu
						slug={post.slug}
						authorUsername={post.author.username}
						hasPoll={post.poll != null}
					/>
				</div>
			</header>

			<div className="relative flex flex-col gap-3 px-4 py-3">
				<Link
					href={postHref}
					className="absolute inset-0 z-0"
					aria-label={`Open post by ${post.author.name}`}
				/>
				<div className="pointer-events-none relative z-[1] [&_*]:pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
					<SocialContentBody
						content={post.content}
						isSpoiler={post.isSpoiler}
						kind="post"
						identifier={post.slug}
						interactiveLinks
					/>
				</div>

				{post.imageUrl ? (
					<Link href={postHref} className="relative z-[1] block">
						<PostAttachedImage
							src={post.imageUrl}
							alt=""
							className="mt-0"
							compact
							edgeToEdge
						/>
					</Link>
				) : null}

				{post.attachment ? (
					<div className="pointer-events-none relative z-[1] [&_*]:pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
						<PostAttachmentCard
							attachment={post.attachment}
							className="w-full"
						/>
					</div>
				) : null}

				{post.poll ? (
					<PostPoll
						postSlug={post.slug}
						initial={post.poll}
						className="relative z-[1]"
					/>
				) : null}

				{post.tierlist ? (
					<PostTierlistSection
						slug={post.slug}
						isSpoiler={post.isSpoiler}
						tierlist={post.tierlist}
						compact
						className="relative z-[1]"
					/>
				) : null}
			</div>

			<div className="flex items-center gap-1 px-2 pb-2 text-muted-foreground text-sm">
				{post.allowLikes ? (
					<PostLikeEngagement
						postSlug={post.slug}
						initialLikeCount={post.likeCount}
						initialLikedByMe={post.likedByMe}
					/>
				) : (
					<span className="px-2 text-xs">Likes off</span>
				)}
				<Button
					render={<Link href={`${postHref}#comments` as Route} />}
					nativeButton={false}
					variant="ghost"
					size="sm"
					className="gap-1.5 tabular-nums"
					aria-label={`${post.commentCount} comments`}
				>
					<MessageCircle className="size-4" aria-hidden />
					{post.commentCount}
				</Button>
				<PostViewsAction
					slug={post.slug}
					authorUsername={post.author.username}
					count={viewCount}
				/>
				<ResourceShareMenu
					path={`/posts/${post.slug}`}
					shareText={shareSnippet(contentPlainText(post.content))}
					label="Share post"
					shareInPost={
						post.allowShares ? { kind: "post", slug: post.slug } : undefined
					}
					className="ms-auto"
				/>
			</div>

			<PostCardComments post={post} />
		</article>
	);
}

/** A just-shared post shows at once, dimmed and inert until the server confirms it. */
export function PostCard(props: PostCardProps) {
	if (!isPendingSlug(props.post.slug)) {
		return <PostCardInner {...props} />;
	}

	return (
		<div
			className="relative select-none opacity-60 *:pointer-events-none"
			aria-busy="true"
		>
			<PostCardInner {...props} />
			<span className="absolute top-3 right-3 z-10 text-muted-foreground text-xs">
				Posting…
			</span>
		</div>
	);
}
