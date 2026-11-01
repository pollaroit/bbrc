import type { GetPostBySlugOutput } from "@bbrc/api/modules/post/post.schema";
import { contentPlainText } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent, CardHeader } from "@bbrc/ui/components/card";
import { ArrowLeft, MessageCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ContentMapView } from "@/components/blocks/content-map/content-map-view";
import { FriendButton } from "@/components/blocks/friend-button";
import { PostAttachedImage } from "@/components/blocks/post-attached-image";
import { PostAttachmentCard } from "@/components/blocks/post-attachment-card";
import { PostBookmarkEngagement } from "@/components/blocks/post-bookmark-engagement";
import { PostCommentFocusSection } from "@/components/blocks/post-comment-focus-section";
import { PostCommentsSection } from "@/components/blocks/post-comments-section";
import { PostLikeEngagement } from "@/components/blocks/post-like-engagement";
import { PostOwnerMenu } from "@/components/blocks/post-owner-menu";
import { PostPoll } from "@/components/blocks/post-poll";
import { PostScheduledBanner } from "@/components/blocks/post-scheduled-banner";
import { PostTierlistSection } from "@/components/blocks/post-tierlist";
import { LivePostViewsAction } from "@/components/blocks/post-views-action";
import { RelativeTime } from "@/components/blocks/relative-time";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { SocialContentBody } from "@/components/blocks/social-content-body";
import { UserPanel } from "@/components/blocks/user-panel";
import { shareSnippet } from "@/lib/share-snippet";

type PostDetailProps = {
	post: GetPostBySlugOutput;
	/** When set, show this comment thread instead of the full comments section. */
	commentFocusSlug?: string | null;
	showCommentsSection?: boolean;
	/** Owner preview of a post that is not live yet. */
	scheduledPreview?: boolean;
};

export function PostDetail({
	post,
	commentFocusSlug = null,
	showCommentsSection = true,
	scheduledPreview = false,
}: PostDetailProps) {
	const isScheduled = scheduledPreview || post.status === "scheduled";
	const showSocial = !isScheduled;
	const profileHref = `/users/${post.author.username}` as Route;
	const postHref = `/posts/${post.slug}` as Route;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<Link
				href={
					isScheduled
						? (`/users/${post.author.username}/posts/scheduled` as Route)
						: ("/" as Route)
				}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				{isScheduled ? "Scheduled posts" : "Feed"}
			</Link>

			{isScheduled ? (
				<PostScheduledBanner
					slug={post.slug}
					authorUsername={post.author.username}
					scheduledAt={post.scheduledAt ?? null}
				/>
			) : null}

			<Card size="sm" className="overflow-hidden">
				<CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
					<Link href={profileHref} className="min-w-0 outline-offset-2">
						<UserPanel user={post.author} className="min-w-0 items-start" />
					</Link>
					<div className="flex shrink-0 items-center gap-2">
						<FriendButton username={post.author.username} />
						<div className="text-right text-muted-foreground text-xs">
							<RelativeTime date={post.createdAt} />
							{post.editedAt ? (
								<p className="text-2xs">
									edited{" "}
									<RelativeTime date={post.editedAt} className="inline" />
								</p>
							) : null}
						</div>
						<PostOwnerMenu
							slug={post.slug}
							authorUsername={post.author.username}
							hasPoll={post.poll != null}
							afterDeleteHref={"/" as Route}
						/>
					</div>
				</CardHeader>

				<CardContent className="flex flex-col gap-4">
					<SocialContentBody
						content={post.content}
						isSpoiler={post.isSpoiler}
						kind="post"
						identifier={post.slug}
						interactiveLinks
					/>

					{post.imageUrl ? (
						<PostAttachedImage
							src={post.imageUrl}
							alt="Post image"
							priority
							edgeToEdge
						/>
					) : null}

					{post.map ? <ContentMapView map={post.map} height={280} /> : null}

					{post.attachment ? (
						<PostAttachmentCard
							attachment={post.attachment}
							className="w-full"
						/>
					) : null}

					{post.poll ? <PostPoll postSlug={post.slug} /> : null}

					{post.tierlist ? (
						<PostTierlistSection
							slug={post.slug}
							isSpoiler={post.isSpoiler}
							tierlist={post.tierlist}
						/>
					) : null}

					{showSocial ? (
						<div className="flex flex-wrap items-center gap-4 border-t pt-4 text-muted-foreground text-sm">
							{post.allowLikes ? (
								<PostLikeEngagement
									postSlug={post.slug}
									initialLikeCount={post.likeCount}
									initialLikedByMe={post.likedByMe}
								/>
							) : (
								<span className="text-xs">Likes off</span>
							)}
							<Link
								href={`/posts/${post.slug}#comments` as Route}
								className="inline-flex items-center gap-1.5 tabular-nums transition-colors hover:text-foreground"
							>
								<MessageCircle className="size-4" aria-hidden />
								{post.commentCount}
							</Link>
							<LivePostViewsAction
								slug={post.slug}
								authorUsername={post.author.username}
							/>
							<PostBookmarkEngagement
								postSlug={post.slug}
								authorUsername={post.author.username}
								allowBookmarks={post.allowBookmarks}
							/>
							<ResourceShareMenu
								path={`/posts/${post.slug}`}
								shareText={shareSnippet(contentPlainText(post.content))}
								label="Share post"
								shareInPost={
									post.allowShares
										? { kind: "post", slug: post.slug }
										: undefined
								}
								size="md"
							/>
						</div>
					) : null}
				</CardContent>
			</Card>

			{commentFocusSlug ? (
				<>
					<PostCommentFocusSection
						postSlug={post.slug}
						focusCommentSlug={commentFocusSlug}
					/>
					<Button
						variant="outline"
						className="w-fit"
						render={<Link href={postHref} />}
						nativeButton={false}
					>
						View all comments
					</Button>
				</>
			) : showCommentsSection && showSocial ? (
				<PostCommentsSection
					postSlug={post.slug}
					allowComments={post.allowComments}
					postAllowBookmarks={post.allowBookmarks}
				/>
			) : null}
		</div>
	);
}
