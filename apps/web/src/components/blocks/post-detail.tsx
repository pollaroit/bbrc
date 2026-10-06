import type { GetPostBySlugOutput } from "@bbrc/api/modules/post/post.schema";
import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent, CardHeader } from "@bbrc/ui/components/card";
import { ArrowLeft, MessageCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { PostAttachedImage } from "@/components/blocks/post-attached-image";
import { PostAttachmentCard } from "@/components/blocks/post-attachment-card";
import { PostCommentFocusSection } from "@/components/blocks/post-comment-focus-section";
import { PostCommentsSection } from "@/components/blocks/post-comments-section";
import { PostEditLink } from "@/components/blocks/post-edit-link";
import { PostLikeEngagement } from "@/components/blocks/post-like-engagement";
import { RelativeTime } from "@/components/blocks/relative-time";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { UserPanel } from "@/components/blocks/user-panel";
import { shareSnippet } from "@/lib/share-snippet";

type PostDetailProps = {
	post: GetPostBySlugOutput;
	/** When set, show this comment thread instead of the full comments section. */
	commentFocusSlug?: string | null;
	showCommentsSection?: boolean;
};

export function PostDetail({
	post,
	commentFocusSlug = null,
	showCommentsSection = true,
}: PostDetailProps) {
	const profileHref = `/users/${post.author.username}` as Route;
	const postHref = `/posts/${post.slug}` as Route;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<Link
				href={"/" as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Feed
			</Link>

			<Card size="sm" className="overflow-hidden">
				<CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
					<Link href={profileHref} className="min-w-0 outline-offset-2">
						<UserPanel user={post.author} className="min-w-0 items-start" />
					</Link>
					<div className="flex shrink-0 items-center gap-2">
						<div className="text-right text-muted-foreground text-xs">
							<RelativeTime date={post.createdAt} />
							{post.editedAt ? (
								<p className="text-[11px]">
									edited{" "}
									<RelativeTime date={post.editedAt} className="inline" />
								</p>
							) : null}
						</div>
						<PostEditLink
							slug={post.slug}
							authorUsername={post.author.username}
						/>
					</div>
				</CardHeader>

				<CardContent className="flex flex-col gap-4">
					<p className="whitespace-pre-wrap text-sm leading-relaxed">
						{post.content}
					</p>

					{post.imageUrl ? (
						<PostAttachedImage
							src={post.imageUrl}
							alt="Post image"
							priority
							edgeToEdge
						/>
					) : null}

					{post.attachment ? (
						<PostAttachmentCard
							attachment={post.attachment}
							className="w-full"
						/>
					) : null}

					<div className="flex flex-wrap items-center gap-4 border-t pt-4 text-muted-foreground text-sm">
						<PostLikeEngagement
							postSlug={post.slug}
							initialLikeCount={post.likeCount}
							initialLikedByMe={post.likedByMe}
						/>
						<Link
							href={`/posts/${post.slug}#comments` as Route}
							className="inline-flex items-center gap-1.5 tabular-nums transition-colors hover:text-foreground"
						>
							<MessageCircle className="size-4" aria-hidden />
							{post.commentCount}
						</Link>
						<ResourceShareMenu
							path={`/posts/${post.slug}`}
							shareText={shareSnippet(post.content)}
							label="Share post"
							shareInPost={{ kind: "post", slug: post.slug }}
							size="md"
						/>
					</div>
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
			) : showCommentsSection ? (
				<PostCommentsSection postSlug={post.slug} />
			) : null}
		</div>
	);
}
