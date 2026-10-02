"use client";

import type { CommentListItem } from "@bbrc/api/modules/comment/comment.schema";
import type { PostListItem } from "@bbrc/api/modules/post/post.schema";
import { CommentSchema } from "@bbrc/schemas";
import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AutoGrowTextarea } from "@/components/blocks/auto-grow-textarea";
import { CommentLikeEngagement } from "@/components/blocks/comment-like-engagement";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserPanel } from "@/components/blocks/user-panel";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

export type CommentDisplayItem =
	| CommentListItem
	| PostListItem["topComments"][number];

type CommentListItemProps = {
	comment: CommentDisplayItem;
	variant?: "compact" | "full";
	/** When set (compact feed previews), links comment text to the post thread. */
	threadHref?: Route;
	/** Required on post detail for author edit/delete. */
	postSlug?: string;
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
				description="Likes on this comment will be removed. This cannot be undone."
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

				const parsed = CommentSchema.shape.content.safeParse(draft.trim());

				if (!parsed.success) {
					toast.error(
						parsed.error.issues[0]?.message ??
							"Comment must be between 1 and 5000 characters",
					);
					return;
				}

				updateMutation.mutate({
					slug: comment.slug,
					content: parsed.data,
				});
			}}
		>
			<AutoGrowTextarea
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				maxLength={5000}
				aria-label="Edit comment"
			/>
			<div className="flex flex-wrap gap-2">
				<LoadingButton
					type="submit"
					size="sm"
					loading={updateMutation.isPending}
					disabled={draft.trim().length < 1}
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

export function CommentListItemView({
	comment,
	variant = "full",
	threadHref,
	postSlug,
	className,
}: CommentListItemProps) {
	const profileHref = `/users/${comment.author.username}` as Route;
	const isCompact = variant === "compact";
	const isFullListItem = !isCompact && postSlug != null;
	const listComment = isFullListItem ? (comment as CommentListItem) : null;
	const [editing, setEditing] = useState(false);
	const editedAt = "editedAt" in comment ? comment.editedAt : null;

	const content = (
		<p
			className={cn(
				"whitespace-pre-wrap text-sm leading-relaxed",
				isCompact && "line-clamp-3",
				threadHref && "transition-colors hover:text-foreground/90",
			)}
		>
			{comment.content}
		</p>
	);

	const body =
		editing && listComment ? (
			<CommentEditForm
				comment={listComment}
				onCancel={() => setEditing(false)}
			/>
		) : (
			<>
				<div className="mb-2 flex flex-wrap items-start justify-between gap-2">
					<Link href={profileHref} className="min-w-0 outline-offset-2">
						<UserPanel
							user={comment.author}
							className="min-w-0"
							imageClassName={isCompact ? "size-6" : undefined}
							titleClassName={isCompact ? "text-xs" : undefined}
							descriptionClassName={isCompact ? "text-[11px]" : undefined}
						/>
					</Link>
					<div className="flex shrink-0 items-center gap-2">
						<div
							className={cn(
								"text-right text-muted-foreground",
								isCompact ? "text-[11px]" : "text-xs",
							)}
						>
							<RelativeTime date={comment.createdAt} />
							{editedAt ? (
								<p className="text-[11px]">
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
				<div className="mt-2">
					<CommentLikeEngagement
						commentSlug={comment.slug}
						initialLikeCount={comment.likeCount}
						initialLikedByMe={comment.likedByMe}
						size={isCompact ? "sm" : "md"}
					/>
				</div>
			</>
		);

	if (isCompact) {
		return (
			<div
				className={cn("rounded-none border bg-muted/20 px-3 py-2", className)}
			>
				{body}
			</div>
		);
	}

	return (
		<Card size="sm" className={className}>
			<CardContent>{body}</CardContent>
		</Card>
	);
}
