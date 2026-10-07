import type { PostAttachmentOutput } from "@bbrc/api/modules/post/post-attachment.schema";
import { shelfTypeFilterLabels } from "@bbrc/api/modules/shelf/shelf.listing";
import { sittingStatusFilterLabels } from "@bbrc/api/modules/sitting/sitting.listing";
import { formatFeedbackRating } from "@bbrc/shared";
import {
	Attachment,
	AttachmentContent,
	AttachmentDescription,
	AttachmentMedia,
	AttachmentTitle,
	AttachmentTrigger,
} from "@bbrc/ui/components/attachment";
import { BookOpen, MessageCircle, ThumbsUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { BookStatusBadge } from "@/components/blocks/book-status-badge";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";
import { postAttachmentHref } from "@/lib/post-attachment-path";
import { cn } from "@/lib/utils";

type PostAttachmentCardProps = {
	attachment: PostAttachmentOutput;
	className?: string;
};

function AttachmentLinkFrame({
	href,
	children,
	className,
}: {
	href: Route;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<Attachment className={cn("w-full min-w-0 max-w-none shrink-0", className)}>
			<AttachmentTrigger render={<Link href={href} />} />
			{children}
		</Attachment>
	);
}

function BookCoverMedia({
	coverId,
	className,
}: {
	coverId: number | null | undefined;
	className?: string;
}) {
	const src = bookCoverUrl(coverId, "M");
	return (
		<AttachmentMedia variant={src ? "image" : "icon"} className={className}>
			{src ? (
				<img src={src} alt="" width={40} height={60} className="object-cover" />
			) : (
				<span className="text-[10px] text-muted-foreground">—</span>
			)}
		</AttachmentMedia>
	);
}

function ShelfCoverMedia({
	coverImageUrl,
	coverPreviewCoverIds,
}: {
	coverImageUrl: string | null;
	coverPreviewCoverIds: (number | null)[];
}) {
	if (coverImageUrl) {
		return (
			<AttachmentMedia variant="image">
				<img src={coverImageUrl} alt="" className="size-full object-cover" />
			</AttachmentMedia>
		);
	}

	const ids = coverPreviewCoverIds.filter((id): id is number => id != null);
	if (ids.length === 0) {
		return (
			<AttachmentMedia variant="icon">
				<span className="text-[10px] text-muted-foreground">Shelf</span>
			</AttachmentMedia>
		);
	}

	return (
		<AttachmentMedia variant="image" className="grid grid-cols-2 gap-px p-px">
			{ids.slice(0, 4).map((id, index) => {
				const src = bookCoverUrl(id, "S");
				return src ? (
					<img
						key={`${id}-${index}`}
						src={src}
						alt=""
						className="size-full object-cover"
					/>
				) : null;
			})}
		</AttachmentMedia>
	);
}

function PostAttachmentBookCard({
	book,
	className,
}: {
	book: Extract<PostAttachmentOutput, { kind: "book" }>["book"];
	className?: string;
}) {
	const href = `/books/${book.slug}` as Route;
	const rating =
		book.averageRating != null ? book.averageRating.toFixed(1) : null;

	return (
		<AttachmentLinkFrame href={href} className={className}>
			<BookCoverMedia coverId={book.coverId} />
			<AttachmentContent>
				<AttachmentTitle>{book.title}</AttachmentTitle>
				<AttachmentDescription>
					{formatBookAuthors(book.authors)}
				</AttachmentDescription>
				<div className="mt-1 flex flex-wrap items-center gap-1.5">
					<BookStatusBadge status={book.status} />
					{rating ? (
						<span className="text-[11px] text-muted-foreground tabular-nums">
							{rating} club avg
						</span>
					) : null}
				</div>
			</AttachmentContent>
		</AttachmentLinkFrame>
	);
}

function PostAttachmentShelfCard({
	shelf,
}: {
	shelf: Extract<PostAttachmentOutput, { kind: "shelf" }>["shelf"];
}) {
	const href = `/users/${shelf.ownerUsername}/shelves/${shelf.slug}` as Route;

	return (
		<AttachmentLinkFrame href={href}>
			<ShelfCoverMedia
				coverImageUrl={shelf.coverImageUrl}
				coverPreviewCoverIds={shelf.coverPreviewCoverIds}
			/>
			<AttachmentContent>
				<AttachmentTitle>{shelf.title}</AttachmentTitle>
				<AttachmentDescription>
					{shelfTypeFilterLabels[shelf.type]} · {shelf.bookCount} book
					{shelf.bookCount === 1 ? "" : "s"}
				</AttachmentDescription>
			</AttachmentContent>
		</AttachmentLinkFrame>
	);
}

function PostAttachmentSittingCard({
	sitting,
}: {
	sitting: Extract<PostAttachmentOutput, { kind: "sitting" }>["sitting"];
}) {
	const href = `/sittings/${sitting.slug}` as Route;
	const title = sitting.displayName;
	const deadlineLabel =
		sitting.status === "voting" && sitting.pollDeadline
			? `Voting ends ${formatDateTime(sitting.pollDeadline)}`
			: sitting.status !== "voting"
				? `Deadline ${formatDateTime(sitting.deadline)}`
				: null;

	const coverId = sitting.selectedBookCoverId;

	return (
		<AttachmentLinkFrame href={href}>
			{coverId != null ? (
				<BookCoverMedia coverId={coverId} />
			) : (
				<AttachmentMedia variant="icon">
					<BookOpen className="size-5 text-muted-foreground" aria-hidden />
				</AttachmentMedia>
			)}
			<AttachmentContent>
				<AttachmentTitle>{title}</AttachmentTitle>
				<AttachmentDescription>
					{sittingStatusFilterLabels[sitting.status]} ·{" "}
					{sitting.participantCount} participant
					{sitting.participantCount === 1 ? "" : "s"}
					{sitting.status === "voting" && sitting.selectedBookTitle
						? ` · ${sitting.selectedBookTitle}`
						: ""}
				</AttachmentDescription>
				{deadlineLabel ? (
					<p className="mt-0.5 text-[11px] text-muted-foreground">
						{deadlineLabel}
					</p>
				) : null}
			</AttachmentContent>
		</AttachmentLinkFrame>
	);
}

function PostAttachmentUserCard({
	user,
}: {
	user: Extract<PostAttachmentOutput, { kind: "user" }>["user"];
}) {
	const href = `/users/${user.username}` as Route;

	return (
		<AttachmentLinkFrame href={href}>
			<AttachmentMedia variant="image" className="overflow-hidden">
				<UserAvatar user={user} className="size-full" />
			</AttachmentMedia>
			<AttachmentContent>
				<AttachmentTitle>{user.name}</AttachmentTitle>
				<AttachmentDescription>@{user.username}</AttachmentDescription>
			</AttachmentContent>
		</AttachmentLinkFrame>
	);
}

function PostAttachmentFeedbackCard({
	feedback,
}: {
	feedback: Extract<PostAttachmentOutput, { kind: "feedback" }>["feedback"];
}) {
	const href =
		`/books/${feedback.book.slug}/feedbacks/${feedback.slug}` as Route;

	return (
		<AttachmentLinkFrame href={href}>
			<BookCoverMedia coverId={feedback.book.coverId} />
			<AttachmentContent>
				<AttachmentTitle>{feedback.book.title}</AttachmentTitle>
				<AttachmentDescription>
					{feedback.author.name} · {formatFeedbackRating(feedback.rating)} / 5
				</AttachmentDescription>
				<p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground leading-snug">
					{feedback.review}
				</p>
				<div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
					<span className="inline-flex items-center gap-0.5">
						<ThumbsUp className="size-3" aria-hidden />
						{feedback.likeCount}
					</span>
					<span className="inline-flex items-center gap-0.5">
						<MessageCircle className="size-3" aria-hidden />
						{feedback.commentCount}
					</span>
				</div>
			</AttachmentContent>
		</AttachmentLinkFrame>
	);
}

function PostAttachmentPostCard({
	post,
}: {
	post: Extract<PostAttachmentOutput, { kind: "post" }>["post"];
}) {
	const href = `/posts/${post.slug}` as Route;

	return (
		<AttachmentLinkFrame href={href}>
			<AttachmentMedia variant="icon">
				<span className="text-[10px] text-muted-foreground">Post</span>
			</AttachmentMedia>
			<AttachmentContent>
				<AttachmentTitle>{post.contentPreview}</AttachmentTitle>
				<AttachmentDescription>
					{post.author.name} · @{post.author.username}
				</AttachmentDescription>
			</AttachmentContent>
		</AttachmentLinkFrame>
	);
}

function PostAttachmentCommentCard({
	comment,
}: {
	comment: Extract<PostAttachmentOutput, { kind: "comment" }>["comment"];
}) {
	const href = postAttachmentHref({ kind: "comment", comment });
	if (!href) {
		return null;
	}

	return (
		<AttachmentLinkFrame href={href}>
			<AttachmentMedia variant="icon">
				<UserAvatar user={comment.author} className="size-full" />
			</AttachmentMedia>
			<AttachmentContent>
				<AttachmentTitle>{comment.contentPreview}</AttachmentTitle>
				<AttachmentDescription>
					{comment.author.name} · @{comment.author.username}
				</AttachmentDescription>
				{comment.contextPost ? (
					<p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
						On post by {comment.contextPost.author.name}:{" "}
						{comment.contextPost.contentPreview}
					</p>
				) : null}
				{comment.parentComment ? (
					<p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
						Reply to {comment.parentComment.author.name}:{" "}
						{comment.parentComment.contentPreview}
					</p>
				) : null}
			</AttachmentContent>
		</AttachmentLinkFrame>
	);
}

export function PostAttachmentCard({
	attachment,
	className,
}: PostAttachmentCardProps) {
	switch (attachment.kind) {
		case "book":
			return (
				<PostAttachmentBookCard book={attachment.book} className={className} />
			);
		case "shelf":
			return (
				<div className={className}>
					<PostAttachmentShelfCard shelf={attachment.shelf} />
				</div>
			);
		case "sitting":
			return (
				<div className={className}>
					<PostAttachmentSittingCard sitting={attachment.sitting} />
				</div>
			);
		case "user":
			return (
				<div className={className}>
					<PostAttachmentUserCard user={attachment.user} />
				</div>
			);
		case "feedback":
			return (
				<div className={className}>
					<PostAttachmentFeedbackCard feedback={attachment.feedback} />
				</div>
			);
		case "post":
			return (
				<div className={className}>
					<PostAttachmentPostCard post={attachment.post} />
				</div>
			);
		case "comment":
			return (
				<div className={className}>
					<PostAttachmentCommentCard comment={attachment.comment} />
				</div>
			);
		default: {
			const _exhaustive: never = attachment;
			return _exhaustive;
		}
	}
}
