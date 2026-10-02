import type { GetPostBySlugOutput } from "@bbrc/api/modules/post/post.schema";
import { Card, CardContent, CardHeader } from "@bbrc/ui/components/card";
import { ArrowLeft, MessageCircle } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { PostCommentsSection } from "@/components/blocks/post-comments-section";
import { PostEditLink } from "@/components/blocks/post-edit-link";
import { PostLikeEngagement } from "@/components/blocks/post-like-engagement";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserPanel } from "@/components/blocks/user-panel";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";

type PostDetailProps = {
	post: GetPostBySlugOutput;
};

function PostAttachedBook({
	book,
}: {
	book: NonNullable<GetPostBySlugOutput["attachedBook"]>;
}) {
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId);

	return (
		<Link
			href={href}
			className="flex items-center gap-3 rounded-none border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
		>
			<div className="relative aspect-2/3 w-14 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
				{coverSrc ? (
					<Image
						src={coverSrc}
						alt=""
						fill
						className="object-cover"
						sizes="56px"
					/>
				) : (
					<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
						No cover
					</div>
				)}
			</div>
			<div className="min-w-0">
				<p className="font-medium text-sm leading-snug">{book.title}</p>
				<p className="text-muted-foreground text-sm">
					{formatBookAuthors(book.authors)}
				</p>
			</div>
		</Link>
	);
}

export function PostDetail({ post }: PostDetailProps) {
	const profileHref = `/users/${post.author.username}` as Route;

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

					{post.attachedBook ? (
						<PostAttachedBook book={post.attachedBook} />
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
					</div>
				</CardContent>
			</Card>

			<PostCommentsSection postSlug={post.slug} />
		</div>
	);
}
