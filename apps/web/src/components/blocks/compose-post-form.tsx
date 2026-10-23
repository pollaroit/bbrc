"use client";

import type { PostAttachmentInput } from "@bbrc/api/modules/post/post-attachment.schema";
import { contentPlainText } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Label } from "@bbrc/ui/components/label";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useComposePost } from "@/components/blocks/compose-post-provider";
import {
	PendingImageAttachment,
	usePendingImageInput,
} from "@/components/blocks/pending-image-attachment";
import {
	PostAttachmentComposePicker,
	type PostAttachmentComposeValue,
} from "@/components/blocks/post-attachment-compose-picker";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
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

function resetComposeForm(
	setContent: (value: string) => void,
	setAttachment: (value: PostAttachmentComposeValue) => void,
	setImageFile: (value: File | null) => void,
	setIsSpoiler: (value: boolean) => void,
) {
	setContent("");
	setAttachment(null);
	setImageFile(null);
	setIsSpoiler(false);
}

type ComposePostDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialAttachment?: PostAttachmentInput | null;
	onClosed?: () => void;
};

export function ComposePostDialog({
	open,
	onOpenChange,
	initialAttachment = null,
	onClosed,
}: ComposePostDialogProps) {
	const router = useRouter();
	const pathname = usePathname();
	const { data: session } = authClient.useSession();
	const [content, setContent] = useState("");
	const [isSpoiler, setIsSpoiler] = useState(false);
	const [attachment, setAttachment] =
		useState<PostAttachmentComposeValue>(null);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const imageInput = usePendingImageInput(setImageFile, { variant: "post" });

	useEffect(() => {
		if (open && initialAttachment) {
			setAttachment(initialAttachment);
		}
	}, [open, initialAttachment]);

	const postListKey = orpc.post.getPostList.key();

	const createMutation = useMutation(
		orpc.post.create.mutationOptions({
			// Posts are created one after another, in the order they were sent.
			scope: { id: "post-create" },
			onMutate: async (variables) => {
				const user = session?.user;
				const pendingSlug = createPendingSlug();
				const draft = { content, isSpoiler, attachment, imageFile };
				const submittedFrom = pathname;

				await queryClient.cancelQueries({ queryKey: postListKey });

				if (user) {
					prependToLists(
						postListKey,
						{
							slug: pendingSlug,
							content: variables.content,
							imageUrl: null,
							isSpoiler: Boolean(variables.isSpoiler),
							createdAt: new Date(),
							editedAt: null,
							author: {
								username: user.username as string,
								name: user.name,
								image: user.image ?? null,
							},
							attachment: null,
							likeCount: 0,
							commentCount: 0,
							likedByMe: false,
							topComments: [],
						},
						(input) =>
							input.feedSort === "recent" &&
							(input.authorUsername == null ||
								input.authorUsername === user.username) &&
							input.hasAttachedBook == null &&
							input.search == null,
					);
				}

				// Close the composer at once; the draft returns if this fails.
				resetComposeForm(setContent, setAttachment, setImageFile, setIsSpoiler);
				if (imageInput.inputRef.current) {
					imageInput.inputRef.current.value = "";
				}
				onOpenChange(false);

				return { pendingSlug, draft, submittedFrom };
			},
			onError: (error, _variables, context) => {
				if (context) {
					removeFromLists(postListKey, context.pendingSlug);
					setContent(context.draft.content);
					setIsSpoiler(context.draft.isSpoiler);
					setAttachment(context.draft.attachment);
					setImageFile(context.draft.imageFile);
					onOpenChange(true);
				}
				toast.error(error.message);
			},
			onSuccess: async ({ slug, xpAwarded }, _variables, context) => {
				swapListItemSlug(postListKey, context.pendingSlug, slug);
				const file = context.draft.imageFile;

				if (file) {
					try {
						await uploadImageForEntity(file, {
							target: "post-image",
							postSlug: slug,
						});
					} catch (error) {
						toast.error(
							error instanceof Error
								? error.message
								: "Post shared, but image upload failed.",
						);
					}
				}

				const postHref = `/posts/${slug}` as Route;
				const seenInFeed =
					context.submittedFrom === "/" ||
					context.submittedFrom?.startsWith("/feed") === true;
				const stillThere = window.location.pathname === context.submittedFrom;

				// On the feed the post is already on screen; elsewhere open it, as before.
				if (stillThere && !seenInFeed) {
					router.replace(postHref);
				} else {
					toast.success(
						xpAwarded > 0 ? `Post shared (+${xpAwarded} XP)` : "Post shared.",
						{
							action: {
								label: "View",
								onClick: () => router.push(postHref),
							},
						},
					);
				}
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: postListKey });
			},
		}),
	);

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);
				if (!nextOpen) {
					resetComposeForm(
						setContent,
						setAttachment,
						setImageFile,
						setIsSpoiler,
					);
					onClosed?.();
					if (imageInput.inputRef.current) {
						imageInput.inputRef.current.value = "";
					}
				}
			}}
		>
			<DialogContent className="flex max-h-[min(90vh,720px)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
				<DialogHeader className="border-border border-b p-6">
					<DialogTitle>Share an update</DialogTitle>
					<DialogDescription>
						Post to the club feed. Optionally attach a book, shelf, or member—or
						use Share → Share in post on any resource.
					</DialogDescription>
				</DialogHeader>

				<form
					className="flex flex-col gap-4 overflow-y-auto p-6"
					onSubmit={(event) => {
						event.preventDefault();

						const plain = contentPlainText(content).trim();
						if (plain.length < 1) {
							toast.error("Content must be at least 1 character long");
							return;
						}
						if (plain.length > 5000) {
							toast.error("Content must be at most 5000 characters");
							return;
						}

						createMutation.mutate({
							content,
							isSpoiler,
							...(attachment ? { attachment } : {}),
						});
					}}
				>
					{imageInput.input}
					{imageInput.cropDialog}
					<Field>
						<FieldLabel htmlFor="compose-post-content">Post</FieldLabel>
						<RichTextEditor
							instanceKey={open ? "compose-open" : "compose-closed"}
							id="compose-post-content"
							value={content}
							onChange={setContent}
							disabled={false}
							placeholder="What are you reading or thinking about?"
						/>
						<div className="mt-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={false}
								onClick={imageInput.openPicker}
							>
								{imageFile ? "Change photo" : "Add photo"}
							</Button>
						</div>
					</Field>

					<div className="flex items-center gap-2">
						<Checkbox
							id="compose-post-spoiler"
							checked={isSpoiler}
							onCheckedChange={(checked) => setIsSpoiler(checked === true)}
							disabled={false}
						/>
						<Label htmlFor="compose-post-spoiler" className="text-sm">
							Mark entire post as spoiler
						</Label>
					</div>

					<Field>
						<FieldLabel>Attachment</FieldLabel>
						<PostAttachmentComposePicker
							value={attachment}
							onChange={setAttachment}
							disabled={false}
						/>
					</Field>

					{imageFile ? (
						<PendingImageAttachment
							variant="post"
							file={imageFile}
							onFileChange={setImageFile}
							disabled={false}
							inputRef={imageInput.inputRef}
						/>
					) : null}

					<DialogFooter className="border-border border-t p-6 pt-4">
						<LoadingButton
							type="submit"
							loading={false}
							disabled={contentPlainText(content).trim().length < 1}
						>
							Post
						</LoadingButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function ComposePostFab({ className }: { className?: string }) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const { openCompose } = useComposePost();

	if (sessionPending || !session?.user) {
		return null;
	}

	return (
		<Button
			type="button"
			size="icon-lg"
			className={cn(
				"fixed right-6 bottom-6 z-50 hidden size-14 shadow-lg md:inline-flex",
				className,
			)}
			aria-label="New post"
			onClick={() => openCompose()}
		>
			<Plus className="size-6" aria-hidden />
		</Button>
	);
}
