"use client";

import { contentPlainText } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Label } from "@bbrc/ui/components/label";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	PendingImageAttachment,
	usePendingImageInput,
} from "@/components/blocks/pending-image-attachment";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { SignInLink } from "@/components/blocks/sign-in-link";
import { uploadImageForEntity } from "@/components/blocks/single-image-upload-field";
import { authClient } from "@/lib/auth-client";
import {
	createPendingSlug,
	prependToLists,
	removeFromLists,
	swapListItemSlug,
} from "@/lib/optimistic/infinite-lists";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type PostCommentFormProps = {
	postSlug?: string;
	feedbackSlug?: string;
	parentSlug?: string;
	replyToUsername?: string;
	onCancelReply?: () => void;
	onCommentCreated?: () => void;
	compact?: boolean;
	autoFocus?: boolean;
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
	await queryClient.invalidateQueries({
		queryKey: orpc.feedback.getFeedbackBySlug.key(),
	});
}

export function PostCommentForm({
	postSlug,
	feedbackSlug,
	parentSlug,
	replyToUsername,
	onCancelReply,
	onCommentCreated,
	compact = false,
	autoFocus = false,
}: PostCommentFormProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [content, setContent] = useState("");
	const [isSpoiler, setIsSpoiler] = useState(false);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [composerOpen, setComposerOpen] = useState(
		Boolean(parentSlug || replyToUsername || autoFocus),
	);
	const [editorEpoch, setEditorEpoch] = useState(0);
	const [shouldFocusEditor, setShouldFocusEditor] = useState(
		Boolean(parentSlug || replyToUsername || autoFocus),
	);
	const fieldId = parentSlug
		? `comment-reply-${parentSlug}`
		: feedbackSlug
			? `feedback-comment-${feedbackSlug}`
			: "post-comment-content";

	const imageInput = usePendingImageInput(setImageFile, { variant: "comment" });

	useEffect(() => {
		if (parentSlug || replyToUsername || autoFocus) {
			setComposerOpen(true);
			setShouldFocusEditor(true);
		}
	}, [parentSlug, replyToUsername, autoFocus]);

	const commentListKey = orpc.comment.getCommentList.key();

	function adjustCommentCount(delta: number) {
		if (postSlug) {
			queryClient.setQueryData(
				orpc.post.getPostBySlug.queryKey({ input: postSlug }),
				(old) =>
					old
						? { ...old, commentCount: Math.max(0, old.commentCount + delta) }
						: old,
			);
		}
		if (feedbackSlug) {
			queryClient.setQueryData(
				orpc.feedback.getFeedbackBySlug.queryKey({ input: feedbackSlug }),
				(old) =>
					old
						? { ...old, commentCount: Math.max(0, old.commentCount + delta) }
						: old,
			);
		}
	}

	const createMutation = useMutation(
		orpc.comment.create.mutationOptions({
			// Comments on the same thing are created one after another, in order.
			scope: { id: `comment-create-${postSlug ?? feedbackSlug ?? "thread"}` },
			onMutate: async (variables) => {
				const user = session?.user;
				const pendingSlug = createPendingSlug();
				const draft = {
					content,
					isSpoiler,
					imageFile,
				};

				await queryClient.cancelQueries({ queryKey: commentListKey });

				if (user) {
					prependToLists(
						commentListKey,
						{
							slug: pendingSlug,
							content: variables.content,
							imageUrl: null,
							isSpoiler: Boolean(variables.isSpoiler),
							createdAt: new Date(),
							editedAt: null,
							depth: variables.parentSlug ? 1 : 0,
							parentSlug: variables.parentSlug ?? null,
							author: {
								username: user.username as string,
								name: user.name,
								image: user.image ?? null,
							},
							likeCount: 0,
							likedByMe: false,
							replyCount: 0,
						},
						(input) =>
							postSlug
								? input.postSlug === postSlug
								: input.feedbackSlug === feedbackSlug,
					);
				}
				adjustCommentCount(1);

				// The form is free again right away; the draft comes back on failure.
				setImageFile(null);
				if (imageInput.inputRef.current) {
					imageInput.inputRef.current.value = "";
				}
				setContent("");
				setIsSpoiler(false);
				setEditorEpoch((epoch) => epoch + 1);
				if (!parentSlug && !replyToUsername) {
					setComposerOpen(false);
				}

				return { pendingSlug, draft };
			},
			onError: (error, _variables, context) => {
				if (context) {
					removeFromLists(commentListKey, context.pendingSlug);
					adjustCommentCount(-1);
					setContent(context.draft.content);
					setIsSpoiler(context.draft.isSpoiler);
					setImageFile(context.draft.imageFile);
					setComposerOpen(true);
					setShouldFocusEditor(true);
					setEditorEpoch((epoch) => epoch + 1);
				}
				toast.error(error.message);
			},
			onSuccess: async (result, _variables, context) => {
				swapListItemSlug(commentListKey, context.pendingSlug, result.slug);
				const file = context.draft.imageFile;

				if (file) {
					try {
						await uploadImageForEntity(file, {
							target: "comment-image",
							commentSlug: result.slug,
						});
					} catch (error) {
						toast.error(
							error instanceof Error
								? error.message
								: "Comment posted, but image upload failed.",
						);
					}
				}

				if (result.xpAwarded > 0) {
					toast.success(`Comment posted (+${result.xpAwarded} XP)`);
				}
				onCommentCreated?.();
			},
			onSettled: () => {
				void invalidateCommentQueries();
			},
		}),
	);

	const isPending = false;

	if (sessionPending) {
		return (
			<p className="text-muted-foreground text-sm">Loading comment form…</p>
		);
	}

	if (!session?.user) {
		return (
			<p className="text-muted-foreground text-sm">
				<SignInLink className="text-foreground underline">Sign in</SignInLink>{" "}
				to join the conversation.
			</p>
		);
	}

	const placeholder = replyToUsername
		? "Write a reply…"
		: "Share your thoughts…";

	if (!composerOpen) {
		return (
			<button
				type="button"
				className={cn(
					"w-full border border-border bg-background px-3 py-2 text-left text-muted-foreground text-sm",
					"transition-colors hover:border-foreground/20 hover:text-foreground",
				)}
				onClick={() => {
					setComposerOpen(true);
					setShouldFocusEditor(true);
					setEditorEpoch((epoch) => epoch + 1);
				}}
			>
				{replyToUsername ? `Reply to @${replyToUsername}` : "Write a comment…"}
			</button>
		);
	}

	return (
		<form
			className={cn("flex min-w-0 flex-col", compact ? "gap-2" : "gap-3")}
			onSubmit={(event) => {
				event.preventDefault();

				const plain = contentPlainText(content).trim();
				if (plain.length < 1) {
					toast.error("Comment must be at least 1 character long");
					return;
				}
				if (plain.length > 5000) {
					toast.error("Comment must be at most 5000 characters");
					return;
				}

				createMutation.mutate({
					...(postSlug ? { postSlug } : {}),
					...(feedbackSlug ? { feedbackSlug } : {}),
					content,
					isSpoiler,
					...(parentSlug ? { parentSlug } : {}),
				});
			}}
		>
			{imageInput.input}
			{imageInput.cropDialog}
			<Field className="min-w-0">
				<FieldLabel
					htmlFor={fieldId}
					className={compact ? "text-xs" : undefined}
				>
					{replyToUsername ? `Reply to @${replyToUsername}` : "Add a comment"}
				</FieldLabel>
				<RichTextEditor
					id={fieldId}
					instanceKey={`${fieldId}-${editorEpoch}`}
					value={content}
					onChange={setContent}
					disabled={isPending}
					placeholder={placeholder}
					minHeightClassName={compact ? "min-h-[5rem]" : "min-h-[8rem]"}
					autoFocus={shouldFocusEditor}
				/>
			</Field>

			<div className="flex items-center gap-2">
				<Checkbox
					id={`${fieldId}-spoiler`}
					checked={isSpoiler}
					onCheckedChange={(checked) => setIsSpoiler(checked === true)}
					disabled={isPending}
				/>
				<Label htmlFor={`${fieldId}-spoiler`} className="text-sm">
					Mark as spoiler
				</Label>
			</div>

			<PendingImageAttachment
				variant="comment"
				file={imageFile}
				onFileChange={setImageFile}
				disabled={isPending}
				inputRef={imageInput.inputRef}
			/>

			<div className="flex flex-wrap items-center gap-2">
				<LoadingButton
					type="submit"
					size={compact ? "sm" : "default"}
					className="w-fit"
					loading={isPending}
					disabled={contentPlainText(content).trim().length < 1}
				>
					{parentSlug ? "Post reply" : "Post comment"}
				</LoadingButton>
				{onCancelReply ? (
					<Button
						type="button"
						variant="outline"
						size={compact ? "sm" : "default"}
						className="w-fit"
						disabled={isPending}
						onClick={onCancelReply}
					>
						Cancel
					</Button>
				) : !parentSlug && !replyToUsername ? (
					<Button
						type="button"
						variant="ghost"
						size={compact ? "sm" : "default"}
						className="w-fit"
						disabled={isPending}
						onClick={() => {
							setContent("");
							setIsSpoiler(false);
							setComposerOpen(false);
							setShouldFocusEditor(false);
						}}
					>
						Collapse
					</Button>
				) : null}
			</div>
		</form>
	);
}
