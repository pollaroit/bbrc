"use client";

import type { CommentListItem } from "@bbrc/api/modules/comment/comment.schema";
import type { PostListItem } from "@bbrc/api/modules/post/post.schema";
import { contentPlainText } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { toast } from "sonner";
import { CommentLikeEngagement } from "@/components/blocks/comment-like-engagement";
import { FullWidthImagePreview } from "@/components/blocks/full-width-image-preview";
import { RemoveMyMentionMenu } from "@/components/blocks/mention/remove-my-mention";
import {
	PendingImageAttachment,
	usePendingImageInput,
} from "@/components/blocks/pending-image-attachment";
import { PostAttachedImage } from "@/components/blocks/post-attached-image";
import { RelativeTime } from "@/components/blocks/relative-time";
import {
	commentSharePath,
	ResourceShareMenu,
} from "@/components/blocks/resource-share-menu";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { uploadImageForEntity } from "@/components/blocks/single-image-upload-field";
import { SocialContentBody } from "@/components/blocks/social-content-body";
import { SubmitShortcutHint } from "@/components/blocks/submit-shortcut-hint";
import { ToolButton } from "@/components/blocks/tool-button";
import { UserPanel } from "@/components/blocks/user-panel";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { Link } from "@/i18n/navigation";
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
	postSlug,
	feedbackSlug,
}: {
	comment: CommentListItem;
	onCancel: () => void;
	postSlug?: string;
	feedbackSlug?: string;
}) {
	const [draft, setDraft] = useState(comment.content);
	// Picture changes wait for Save; Cancel throws them away.
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [removeImage, setRemoveImage] = useState(false);
	const [savingImage, setSavingImage] = useState(false);
	const imageInput = usePendingImageInput(
		(file) => {
			setImageFile(file);
			if (file) setRemoveImage(false);
		},
		{ variant: "comment" },
	);

	const textChanged = draft !== comment.content;
	const keptImageUrl = removeImage ? null : comment.imageUrl;

	const updateMutation = useMutation(
		orpc.comment.update.mutationOptions({
			onError: (error) => toast.error(error.message),
		}),
	);
	const busy = updateMutation.isPending || savingImage;

	async function save() {
		if (busy) return;
		const plain = contentPlainText(draft).trim();
		if (plain.length < 1) {
			toast.error("Comment must be at least 1 character long");
			return;
		}
		if (plain.length > 5000) {
			toast.error("Comment must be at most 5000 characters");
			return;
		}

		try {
			if (textChanged) {
				await updateMutation.mutateAsync({
					slug: comment.slug,
					content: draft,
				});
			}
		} catch {
			return; // the mutation already showed the error
		}

		setSavingImage(true);
		try {
			if (imageFile) {
				await uploadImageForEntity(imageFile, {
					target: "comment-image",
					commentSlug: comment.slug,
				});
			} else if (removeImage && comment.imageUrl) {
				await orpc.storage.removeCommentImage.call({
					commentSlug: comment.slug,
				});
			}
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "The text was saved, but the image could not be updated.",
			);
			setSavingImage(false);
			await invalidateCommentQueries();
			return;
		}
		toast.success("Comment updated.");
		await invalidateCommentQueries();
		setSavingImage(false);
		onCancel();
	}

	return (
		<form
			className="flex flex-col gap-3"
			onSubmit={(event) => {
				event.preventDefault();
				void save();
			}}
		>
			{imageInput.input}
			{imageInput.cropDialog}
			<RichTextEditor
				instanceKey={comment.slug}
				mentionContext={{ postSlug, feedbackSlug }}
				value={draft}
				onChange={setDraft}
				onSubmitShortcut={() => void save()}
				disabled={busy}
			/>
			{imageFile ? (
				<PendingImageAttachment
					variant="comment"
					file={imageFile}
					onFileChange={setImageFile}
					disabled={busy}
					inputRef={imageInput.inputRef}
				/>
			) : keptImageUrl ? (
				<FullWidthImagePreview
					src={keptImageUrl}
					alt="Comment image"
					compact
					bleed={false}
					disabled={busy}
					onReplace={imageInput.openPicker}
					onRemove={() => setRemoveImage(true)}
				/>
			) : null}
			<div className="flex flex-wrap items-center gap-2">
				<ToolButton
					className="-ms-2"
					icon={<ImagePlus className="size-[18px]" aria-hidden />}
					label={keptImageUrl || imageFile ? "Change photo" : "Add a photo"}
					active={imageFile != null || keptImageUrl != null}
					disabled={busy}
					onClick={imageInput.openPicker}
				/>
				<LoadingButton
					type="submit"
					size="sm"
					loading={busy}
					disabled={contentPlainText(draft).trim().length < 1}
				>
					Save
				</LoadingButton>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={busy}
					onClick={onCancel}
				>
					Cancel
				</Button>
				<SubmitShortcutHint verb="save" />
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
				compact={isCompact}
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
				postSlug={postSlug}
				feedbackSlug={feedbackContextSlug}
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
							<RemoveMyMentionMenu kind="comment" slug={comment.slug} />
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
					<RemoveMyMentionMenu kind="comment" slug={comment.slug} />
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
