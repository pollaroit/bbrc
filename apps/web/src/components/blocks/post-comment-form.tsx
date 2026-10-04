"use client";

import { CommentSchema } from "@bbrc/schemas";
import { Button } from "@bbrc/ui/components/button";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	PendingImageAttachment,
	usePendingImageInput,
} from "@/components/blocks/pending-image-attachment";
import { SignInLink } from "@/components/blocks/sign-in-link";
import { uploadImageForEntity } from "@/components/blocks/single-image-upload-field";
import { TextareaWithImageAttach } from "@/components/blocks/textarea-with-image-attach";
import { authClient } from "@/lib/auth-client";
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
	const [imageFile, setImageFile] = useState<File | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fieldId = parentSlug
		? `comment-reply-${parentSlug}`
		: feedbackSlug
			? `feedback-comment-${feedbackSlug}`
			: "post-comment-content";

	useEffect(() => {
		if (!autoFocus) {
			return;
		}
		const node = textareaRef.current;
		if (!node) {
			return;
		}
		node.focus({ preventScroll: true });
	}, [autoFocus]);

	const imageInput = usePendingImageInput(setImageFile, { variant: "comment" });

	const createMutation = useMutation(
		orpc.comment.create.mutationOptions({
			onSuccess: async (result) => {
				const file = imageFile;
				setImageFile(null);
				if (imageInput.inputRef.current) {
					imageInput.inputRef.current.value = "";
				}

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

				toast.success(
					result.xpAwarded > 0
						? `Comment posted (+${result.xpAwarded} XP)`
						: "Comment posted.",
				);
				setContent("");
				await invalidateCommentQueries();
				onCommentCreated?.();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const isPending = createMutation.isPending;

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

	return (
		<form
			className={cn("flex min-w-0 flex-col", compact ? "gap-2" : "gap-3")}
			onSubmit={(event) => {
				event.preventDefault();

				const parsed = CommentSchema.shape.content.safeParse(content.trim());

				if (!parsed.success) {
					toast.error(
						parsed.error.issues[0]?.message ??
							"Comment must be between 1 and 5000 characters",
					);
					return;
				}

				createMutation.mutate({
					...(postSlug ? { postSlug } : {}),
					...(feedbackSlug ? { feedbackSlug } : {}),
					content: parsed.data,
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
				<TextareaWithImageAttach
					ref={textareaRef}
					id={fieldId}
					value={content}
					onChange={(event) => setContent(event.target.value)}
					maxLength={5000}
					placeholder={
						replyToUsername ? "Write a reply…" : "Share your thoughts…"
					}
					onAttachClick={imageInput.openPicker}
					attachDisabled={isPending}
					hasPhoto={imageFile !== null}
				/>
			</Field>

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
					disabled={content.trim().length < 1}
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
				) : null}
			</div>
		</form>
	);
}
