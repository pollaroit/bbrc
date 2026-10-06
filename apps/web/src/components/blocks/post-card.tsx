import type { GetPostListOutput } from "@bbrc/api/modules/post/post.schema";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@bbrc/ui/components/card";
import { MessageCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CommentListItemView } from "@/components/blocks/comment-list-item";
import { PostAttachedImage } from "@/components/blocks/post-attached-image";
import { PostAttachmentCard } from "@/components/blocks/post-attachment-card";
import { PostLikeEngagement } from "@/components/blocks/post-like-engagement";
import { RelativeTime } from "@/components/blocks/relative-time";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { UserPanel } from "@/components/blocks/user-panel";
import { shareSnippet } from "@/lib/share-snippet";
import { cn } from "@/lib/utils";

export type PostCardPost = GetPostListOutput["items"][number];

type PostCardProps = {
	post: PostCardPost;
	className?: string;
};

export function PostCard({ post, className }: PostCardProps) {
	const postHref = `/posts/${post.slug}` as Route;
	const profileHref = `/users/${post.author.username}` as Route;

	return (
		<Card size="sm" className={cn("overflow-hidden", className)}>
			<CardHeader className="flex flex-row items-start justify-between gap-3 border-b">
				<Link href={profileHref} className="min-w-0 outline-offset-2">
					<UserPanel user={post.author} className="min-w-0 items-start" />
				</Link>
				<div className="shrink-0 text-right text-muted-foreground text-xs">
					<Link
						href={postHref}
						className="block transition-colors hover:text-foreground"
					>
						<RelativeTime
							date={post.createdAt}
							className="text-muted-foreground text-xs"
						/>
					</Link>
					{post.editedAt ? <p className="text-[11px]">edited</p> : null}
				</div>
			</CardHeader>

			<CardContent className="flex flex-col gap-3">
				<Link
					href={postHref}
					className="block whitespace-pre-wrap text-sm leading-relaxed transition-colors hover:text-foreground/90"
				>
					{post.content}
				</Link>

				{post.imageUrl ? (
					<Link href={postHref} className="block">
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
					<PostAttachmentCard attachment={post.attachment} className="w-full" />
				) : null}
			</CardContent>

			<CardFooter className="flex flex-col items-stretch gap-3 border-t bg-muted/10">
				<div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
					<PostLikeEngagement
						postSlug={post.slug}
						initialLikeCount={post.likeCount}
						initialLikedByMe={post.likedByMe}
					/>
					<Link
						href={`${postHref}#comments` as Route}
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
					/>
				</div>

				{post.topComments.length > 0 ? (
					<div className="border border-border bg-background px-3 pt-3 pb-1 sm:px-4">
						<ul className="flex flex-col divide-y divide-border/60">
							{post.topComments.map((comment) => (
								<li key={comment.slug} className="py-3 first:pt-0 last:pb-2">
									<CommentListItemView
										comment={comment}
										variant="compact"
										layout="thread"
										postSlug={post.slug}
										threadHref={`${postHref}#comment-${comment.slug}` as Route}
									/>
								</li>
							))}
						</ul>
						{post.commentCount > post.topComments.length ? (
							<Link
								href={`${postHref}#comments` as Route}
								className="block border-border border-t py-2.5 text-center text-muted-foreground text-xs transition-colors hover:text-foreground"
							>
								View all {post.commentCount} comments
							</Link>
						) : null}
					</div>
				) : null}
			</CardFooter>
		</Card>
	);
}
