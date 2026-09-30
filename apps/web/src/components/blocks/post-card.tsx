import type { GetPostListOutput } from "@bbrc/api/modules/post/post.schema";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@bbrc/ui/components/card";
import { MessageCircle } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { CommentListItemView } from "@/components/blocks/comment-list-item";
import { PostLikeEngagement } from "@/components/blocks/post-like-engagement";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserPanel } from "@/components/blocks/user-panel";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

export type PostCardPost = GetPostListOutput["items"][number];

type PostCardProps = {
	post: PostCardPost;
	className?: string;
};

function PostAttachedBook({
	book,
}: {
	book: NonNullable<PostCardPost["attachedBook"]>;
}) {
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId);

	return (
		<Link
			href={href}
			className="flex items-center gap-3 rounded-none border bg-muted/30 p-2 transition-colors hover:bg-muted/50"
		>
			<div className="relative aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
				{coverSrc ? (
					<Image
						src={coverSrc}
						alt=""
						fill
						className="object-cover"
						sizes="40px"
					/>
				) : (
					<div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
						—
					</div>
				)}
			</div>
			<div className="min-w-0">
				<p className="line-clamp-2 font-medium text-sm leading-snug">
					{book.title}
				</p>
				<p className="truncate text-muted-foreground text-xs">
					{formatBookAuthors(book.authors)}
				</p>
			</div>
		</Link>
	);
}

export function PostCard({ post, className }: PostCardProps) {
	const postHref = `/posts/${post.slug}` as Route;
	const profileHref = `/users/${post.author.username}` as Route;

	return (
		<Card size="sm" className={cn("overflow-hidden", className)}>
			<CardHeader className="flex flex-row items-start justify-between gap-3 border-b">
				<Link
					href={profileHref}
					className="min-w-0 rounded-sm outline-offset-2"
				>
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

				{post.attachedBook ? (
					<PostAttachedBook book={post.attachedBook} />
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
				</div>

				{post.topComments.length > 0 ? (
					<div className="flex flex-col gap-2">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Top comments
						</p>
						{post.topComments.map((comment) => (
							<CommentListItemView
								key={comment.slug}
								comment={comment}
								variant="compact"
								threadHref={`${postHref}#comments` as Route}
							/>
						))}
					</div>
				) : null}
			</CardFooter>
		</Card>
	);
}
