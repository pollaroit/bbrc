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
	/** Shown instead of the username: "Reply to Ann". */
	replyToName?: string;
	onCancelReply?: () => void;
	onCommentCreated?: () => void;
	/** Called the moment a reply is sent, so the parent can close the reply box. */
	onSubmitted?: () => void;
	/** Called when sending failed and the reply box should open again with the draft. */
	onSubmitFailed?: () => void;
	compact?: boolean;
	autoFocus?: boolean;
};

type CommentDraft = {
	content: string;
	isSpoiler: boolean;
	imageFile: File | null;
};

/** Drafts of replies that failed after their box closed; the box reads it when it reopens. */
const failedReplyDrafts = new Map<string, CommentDraft>();

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
	replyToName,
	onCancelReply,
	onCommentCreated,
	onSubmitted,
	onSubmitFailed,
	compact = false,
	autoFocus = false,
}: PostCommentFormProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const draftKey = `${postSlug ?? feedbackSlug ?? "thread"}:${parentSlug ?? "root"}`;
	const [restoredDraft] = useState(() => failedReplyDrafts.get(draftKey));
	const [content, setContent] = useState(restoredDraft?.content ?? "");
	const [isSpoiler, setIsSpoiler] = useState(restoredDraft?.isSpoiler ?? false);
	const [imageFile, setImageFile] = useState<File | null>(
		restoredDraft?.imageFile ?? null,
	);
	const [composerOpen, setComposerOpen] = useState(
		Boolean(parentSlug || replyToUsername || autoFocus),
	);
	const [editorEpoch, setEditorEpoch] = useState(0);
	const [shouldFocusEditor, setShouldFocusEditor] = useState(
		Boolean(parentSlug || replyToUsername || autoFocus),
	);
	const replyLabel = replyToName ?? replyToUsername;
	const fieldId = parentSlug
		? `comment-reply-${parentSlug}`
		: feedbackSlug
			? `feedback-comment-${feedbackSlug}`
			: "post-comment-content";

	const imageInput = usePendingImageInput(setImageFile, { variant: "comment" });

	useEffect(() => {
		failedReplyDrafts.delete(draftKey);
	}, [draftKey]);

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

	/** The post in every cached feed, so its preview and count change at once. */
	function patchFeedPost(
		change: (item: {
			commentCount: number;
			topComments: {
				slug: string;
				replyCount: number;
				latestReply: { slug: string } | null;
			}[];
		}) => unknown,
	) {
		if (!postSlug) return [];
		const snapshots = queryClient.getQueriesData({
			queryKey: orpc.post.getPostList.key(),
		});
		for (const [key, data] of snapshots) {
			const list = data as
				| { pages: { items: { slug: string }[] }[]; pageParams: unknown[] }
				| undefined;
			if (!list?.pages) continue;
			queryClient.setQueryData(key, {
				...list,
				pages: list.pages.map((page) => ({
					...page,
					items: page.items.map((item) =>
						item.slug === postSlug
							? change(
									item as unknown as {
										commentCount: number;
										topComments: {
											slug: string;
											replyCount: number;
											latestReply: { slug: string } | null;
										}[];
									},
								)
							: item,
					),
				})),
			});
		}
		return snapshots;
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
				const pendingPreview = user
					? {
							slug: pendingSlug,
							content: variables.content,
							imageUrl: null,
							isSpoiler: Boolean(variables.isSpoiler),
							createdAt: new Date(),
							author: {
								username: user.username as string,
								name: user.name,
								image: user.image ?? null,
							},
							likeCount: 0,
							likedByMe: false,
						}
					: null;
				const feedSnapshots = patchFeedPost((item) => ({
					...item,
					commentCount: item.commentCount + 1,
					topComments: !pendingPreview
						? item.topComments
						: variables.parentSlug
							? // A reply shows under the comment it answers.
								item.topComments.map((comment) =>
									comment.slug === variables.parentSlug
										? {
												...comment,
												replyCount: comment.replyCount + 1,
												latestReply: pendingPreview,
											}
										: comment,
								)
							: [
									{ ...pendingPreview, replyCount: 0, latestReply: null },
									...item.topComments,
								].slice(0, 3),
				}));

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
				onSubmitted?.();

				return { pendingSlug, draft, feedSnapshots };
			},
			onError: (error, _variables, context) => {
				if (context) {
					removeFromLists(commentListKey, context.pendingSlug);
					adjustCommentCount(-1);
					for (const [key, data] of context.feedSnapshots) {
						queryClient.setQueryData(key, data);
					}
					setContent(context.draft.content);
					setIsSpoiler(context.draft.isSpoiler);
					setImageFile(context.draft.imageFile);
					setComposerOpen(true);
					setShouldFocusEditor(true);
					setEditorEpoch((epoch) => epoch + 1);

					// A reply box that already closed reopens with this draft.
					if (parentSlug || replyToUsername) {
						failedReplyDrafts.set(draftKey, context.draft);
						onSubmitFailed?.();
					}
				}
				toast.error(error.message);
			},
			onSuccess: async (result, _variables, context) => {
				swapListItemSlug(commentListKey, context.pendingSlug, result.slug);
				patchFeedPost((item) => ({
					...item,
					topComments: item.topComments.map((comment) => ({
						...comment,
						...(comment.slug === context.pendingSlug
							? { slug: result.slug }
							: {}),
						...(comment.latestReply?.slug === context.pendingSlug
							? { latestReply: { ...comment.latestReply, slug: result.slug } }
							: {}),
					})),
				}));
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

	function submitComment() {
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
	}

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
				{replyLabel ? `Reply to ${replyLabel}` : "Write a comment…"}
			</button>
		);
	}

	return (
		<form
			className={cn("flex min-w-0 flex-col", compact ? "gap-2" : "gap-3")}
			onSubmit={(event) => {
				event.preventDefault();
				submitComment();
			}}
		>
			{imageInput.input}
			{imageInput.cropDialog}
			<Field className="min-w-0">
				<FieldLabel
					htmlFor={fieldId}
					className={compact ? "text-xs" : undefined}
				>
					{replyLabel ? `Reply to ${replyLabel}` : "Add a comment"}
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
					onSubmitShortcut={submitComment}
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
