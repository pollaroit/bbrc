"use client";

import type { CommentListItem } from "@bbrc/api/modules/comment/comment.schema";
import type { PostListItem } from "@bbrc/api/modules/post/post.schema";
import { contentPlainText } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CommentLikeEngagement } from "@/components/blocks/comment-like-engagement";
import { PostAttachedImage } from "@/components/blocks/post-attached-image";
import { RelativeTime } from "@/components/blocks/relative-time";
import {
	commentSharePath,
	ResourceShareMenu,
} from "@/components/blocks/resource-share-menu";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { SingleImageUploadField } from "@/components/blocks/single-image-upload-field";
import { SocialContentBody } from "@/components/blocks/social-content-body";
import { UserPanel } from "@/components/blocks/user-panel";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { isPendingSlug } from "@/lib/optimistic/infinite-lists";
import { shareSnippet } from "@/lib/share-snippet";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

export type CommentDisplayItem =
	| CommentListItem
	| PostListItem["topComments"][number];

type CommentListItemProps = {
	comment: CommentDisplayItem;
	variant?: "compact" | "full";
	/** Thread view on post detail uses flat rows; card layout for legacy/other surfaces. */
	layout?: "card" | "thread";
	/** When set (compact feed previews), links comment text to the post thread. */
	threadHref?: Route;
	/** Show “View in thread” (post detail only — hidden on feed previews). */
	showThreadLink?: boolean;
	/** Required on post detail for author edit/delete. */
	postSlug?: string;
	bookSlug?: string;
	feedbackContextSlug?: string;
	canReply?: boolean;
	onReply?: () => void;
	className?: string;
};

async function invalidateCommentQueries() {
	await queryClient.invalidateQueries({
		queryKey: orpc.comment.getCommentList.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.post.getPostList.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.post.getPostBySlug.key(),
	});
}

function CommentAuthorActions({
	comment,
	onEditingChange,
}: {
	comment: CommentListItem;
	onEditingChange: (editing: boolean) => void;
}) {
	const { data: session, isPending } = authClient.useSession();
	const [deleteOpen, setDeleteOpen] = useState(false);

	const deleteMutation = useMutation(
		orpc.comment.delete.mutationOptions({
			onSuccess: async () => {
				setDeleteOpen(false);
				toast.success("Comment deleted.");
				await invalidateCommentQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (
		isPending ||
		isPendingSlug(comment.slug) ||
		!session?.user.username ||
		session.user.username !== comment.author.username
	) {
		return null;
	}

	return (
		<div className="flex shrink-0 items-center gap-0.5">
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				className="text-muted-foreground hover:text-foreground"
				aria-label="Edit comment"
				disabled={deleteMutation.isPending}
				onClick={() => onEditingChange(true)}
			>
				<Pencil className="size-3.5" />
			</Button>
			<LoadingButton
				type="button"
				variant="ghost"
				size="icon-sm"
				className="text-muted-foreground hover:text-destructive"
				aria-label="Delete comment"
				loading={deleteMutation.isPending}
				onClick={() => setDeleteOpen(true)}
			>
				<Trash2 className="size-3.5" />
			</LoadingButton>
			<DestructiveConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title="Delete comment?"
				description="Replies and likes on this comment will be removed. This cannot be undone."
				confirmLabel="Delete comment"
				loading={deleteMutation.isPending}
				onConfirm={() => deleteMutation.mutate({ slug: comment.slug })}
			/>
		</div>
	);
}

function CommentEditForm({
	comment,
	onCancel,
}: {
	comment: CommentListItem;
	onCancel: () => void;
}) {
	const [draft, setDraft] = useState(comment.content);

	const updateMutation = useMutation(
		orpc.comment.update.mutationOptions({
			onSuccess: async () => {
				toast.success("Comment updated.");
				await invalidateCommentQueries();
				onCancel();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<form
			className="flex flex-col gap-3"
			onSubmit={(event) => {
				event.preventDefault();

				const plain = contentPlainText(draft).trim();
				if (plain.length < 1) {
					toast.error("Comment must be at least 1 character long");
					return;
				}
				if (plain.length > 5000) {
					toast.error("Comment must be at most 5000 characters");
					return;
				}

				updateMutation.mutate({
					slug: comment.slug,
					content: draft,
				});
			}}
		>
			<RichTextEditor
				instanceKey={comment.slug}
				value={draft}
				onChange={setDraft}
				disabled={updateMutation.isPending}
			/>
			<SingleImageUploadField
				label="Comment image"
				currentUrl={comment.imageUrl}
				uploadTarget={{
					target: "comment-image",
					commentSlug: comment.slug,
				}}
				onRemove={async () => {
					await orpc.storage.removeCommentImage.call({
						commentSlug: comment.slug,
					});
				}}
				onSuccess={async () => {
					await invalidateCommentQueries();
				}}
			/>
			<div className="flex flex-wrap gap-2">
				<LoadingButton
					type="submit"
					size="sm"
					loading={updateMutation.isPending}
					disabled={contentPlainText(draft).trim().length < 1}
				>
					Save
				</LoadingButton>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={updateMutation.isPending}
					onClick={onCancel}
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}

function CommentListItemViewInner({
	comment,
	variant = "full",
	layout = "card",
	threadHref,
	showThreadLink = false,
	postSlug,
	bookSlug,
	feedbackContextSlug,
	canReply = false,
	onReply,
	className,
}: CommentListItemProps) {
	const { data: session } = authClient.useSession();
	const profileHref = `/users/${comment.author.username}` as Route;
	const isCompact = variant === "compact";
	const isThread = layout === "thread";
	const isFullListItem =
		!isCompact && (postSlug != null || feedbackContextSlug != null);
	const listComment = isFullListItem ? (comment as CommentListItem) : null;
	const [editing, setEditing] = useState(false);
	const editedAt = "editedAt" in comment ? comment.editedAt : null;
	const commentShare =
		commentSharePath({
			postSlug,
			bookSlug,
			feedbackContextSlug,
			commentSlug: comment.slug,
		}) ?? null;

	const commentImageUrl = "imageUrl" in comment ? comment.imageUrl : null;

	const commentIsSpoiler =
		"isSpoiler" in comment ? Boolean(comment.isSpoiler) : false;
	const commentKind = feedbackContextSlug ? "feedback" : "comment";
	const commentIdentifier = comment.slug;

	const content = (
		<div className="flex flex-col gap-2">
			<SocialContentBody
				content={comment.content}
				isSpoiler={commentIsSpoiler}
				kind={commentKind}
				identifier={commentIdentifier}
				interactiveLinks
				className={cn(
					isCompact &&
						"max-h-[4.75rem] overflow-hidden [mask-image:linear-gradient(180deg,#000_70%,transparent)]",
				)}
			/>
			{commentImageUrl ? (
				<PostAttachedImage
					src={commentImageUrl}
					alt="Comment image"
					compact
					className={cn(isCompact ? "max-w-full" : "max-w-md")}
				/>
			) : null}
			{showThreadLink && threadHref && isThread ? (
				<Link
					href={threadHref}
					className="text-muted-foreground text-xs hover:text-foreground"
				>
					Jump to comment on post
				</Link>
			) : null}
		</div>
	);

	const body =
		editing && listComment ? (
			<CommentEditForm
				comment={listComment}
				onCancel={() => setEditing(false)}
			/>
		) : isThread ? (
			<>
				<div className="flex items-start gap-3">
					<Link href={profileHref} className="shrink-0 outline-offset-2">
						<UserPanel
							user={comment.author}
							className="min-w-0"
							renderTitle={false}
							renderDescription={false}
							imageClassName={isCompact ? "size-6" : "size-8"}
						/>
					</Link>
					<div className="min-w-0 flex-1">
						<div
							className={cn(
								"mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground",
								isCompact ? "text-2xs" : "text-xs",
							)}
						>
							<Link
								href={profileHref}
								className={cn(
									"font-medium text-foreground hover:underline",
									isCompact ? "text-xs" : "text-sm",
								)}
							>
								{comment.author.name}
							</Link>
							<span className="text-muted-foreground">
								@{comment.author.username}
							</span>
							<span aria-hidden>·</span>
							<RelativeTime date={comment.createdAt} />
							{editedAt ? (
								<span>
									· edited <RelativeTime date={editedAt} className="inline" />
								</span>
							) : null}
							{listComment ? (
								<span className="ml-auto flex shrink-0 items-center">
									<CommentAuthorActions
										comment={listComment}
										onEditingChange={setEditing}
									/>
								</span>
							) : null}
						</div>
						{content}
						<div className="mt-2 flex flex-wrap items-center gap-1">
							<CommentLikeEngagement
								commentSlug={comment.slug}
								initialLikeCount={comment.likeCount}
								initialLikedByMe={comment.likedByMe}
								size="sm"
							/>
							{commentShare ? (
								<ResourceShareMenu
									path={commentShare}
									shareText={shareSnippet(contentPlainText(comment.content))}
									label="Share comment"
									shareInPost={{ kind: "comment", slug: comment.slug }}
								/>
							) : null}
							{canReply && onReply && session?.user ? (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 px-2 text-muted-foreground text-xs hover:text-foreground"
									onClick={onReply}
								>
									Reply
								</Button>
							) : null}
						</div>
					</div>
				</div>
			</>
		) : (
			<>
				<div className="mb-2 flex flex-wrap items-start justify-between gap-2">
					<Link href={profileHref} className="min-w-0 outline-offset-2">
						<UserPanel
							user={comment.author}
							className="min-w-0"
							imageClassName={isCompact ? "size-6" : undefined}
							titleClassName={isCompact ? "text-xs" : undefined}
							descriptionClassName={isCompact ? "text-2xs" : undefined}
						/>
					</Link>
					<div className="flex shrink-0 items-center gap-2">
						<div
							className={cn(
								"text-right text-muted-foreground",
								isCompact ? "text-2xs" : "text-xs",
							)}
						>
							<RelativeTime date={comment.createdAt} />
							{editedAt ? (
								<p className="text-2xs">
									edited <RelativeTime date={editedAt} className="inline" />
								</p>
							) : null}
						</div>
						{listComment ? (
							<CommentAuthorActions
								comment={listComment}
								onEditingChange={setEditing}
							/>
						) : null}
					</div>
				</div>
				{threadHref ? (
					<Link href={threadHref} className="block outline-offset-2">
						{content}
					</Link>
				) : (
					content
				)}
				<div className="mt-2 flex flex-wrap items-center gap-3">
					<CommentLikeEngagement
						commentSlug={comment.slug}
						initialLikeCount={comment.likeCount}
						initialLikedByMe={comment.likedByMe}
						size={isCompact ? "sm" : "md"}
					/>
					{commentShare ? (
						<ResourceShareMenu
							path={commentShare}
							shareText={shareSnippet(contentPlainText(comment.content))}
							label="Share comment"
							shareInPost={{ kind: "comment", slug: comment.slug }}
						/>
					) : null}
					{canReply && onReply && session?.user ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-auto px-2 py-1 text-muted-foreground text-xs"
							onClick={onReply}
						>
							Reply
						</Button>
					) : null}
				</div>
			</>
		);

	if (isCompact && !isThread) {
		return (
			<div className={cn("border bg-muted/20 px-3 py-2", className)}>
				{body}
			</div>
		);
	}

	if (isThread) {
		return (
			<article
				id={`comment-${comment.slug}`}
				className={cn("scroll-mt-24", className)}
			>
				{body}
			</article>
		);
	}

	return (
		<Card
			size="sm"
			id={`comment-${comment.slug}`}
			className={cn("scroll-mt-24", className)}
		>
			<CardContent>{body}</CardContent>
		</Card>
	);
}

/** A just-posted comment shows at once, dimmed and inert until the server confirms it. */
export function CommentListItemView(props: CommentListItemProps) {
	if (!isPendingSlug(props.comment.slug)) {
		return <CommentListItemViewInner {...props} />;
	}

	return (
		<div
			className="relative select-none opacity-60 *:pointer-events-none"
			aria-busy="true"
		>
			<CommentListItemViewInner {...props} />
			<span className="absolute top-2 right-2 text-muted-foreground text-xs">
				Posting…
			</span>
		</div>
	);
}
