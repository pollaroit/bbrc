"use client";

import type { PostAttachmentInput } from "@bbrc/api/modules/post/post-attachment.schema";
import { PostSchema } from "@bbrc/schemas";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
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
import { uploadImageForEntity } from "@/components/blocks/single-image-upload-field";
import { TextareaWithImageAttach } from "@/components/blocks/textarea-with-image-attach";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

function resetComposeForm(
	setContent: (value: string) => void,
	setAttachment: (value: PostAttachmentComposeValue) => void,
	setImageFile: (value: File | null) => void,
) {
	setContent("");
	setAttachment(null);
	setImageFile(null);
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
	const [content, setContent] = useState("");
	const [attachment, setAttachment] =
		useState<PostAttachmentComposeValue>(null);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const imageInput = usePendingImageInput(setImageFile, { variant: "post" });

	useEffect(() => {
		if (open && initialAttachment) {
			setAttachment(initialAttachment);
		}
	}, [open, initialAttachment]);

	const createMutation = useMutation(
		orpc.post.create.mutationOptions({
			onSuccess: async ({ slug, xpAwarded }) => {
				const file = imageFile;
				setImageFile(null);

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

				toast.success(
					xpAwarded > 0 ? `Post shared (+${xpAwarded} XP)` : "Post shared.",
				);
				resetComposeForm(setContent, setAttachment, setImageFile);
				onOpenChange(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.post.getPostList.key(),
				});
				router.push(`/posts/${slug}` as Route);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);
				if (!nextOpen) {
					resetComposeForm(setContent, setAttachment, setImageFile);
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

						const parsed = PostSchema.shape.content.safeParse(content.trim());

						if (!parsed.success) {
							toast.error(
								parsed.error.issues[0]?.message ??
									"Content must be between 1 and 5000 characters",
							);
							return;
						}

						createMutation.mutate({
							content: parsed.data,
							...(attachment ? { attachment } : {}),
						});
					}}
				>
					{imageInput.input}
					{imageInput.cropDialog}
					<Field>
						<FieldLabel htmlFor="compose-post-content">Post</FieldLabel>
						<TextareaWithImageAttach
							id="compose-post-content"
							value={content}
							onChange={(event) => setContent(event.target.value)}
							maxLength={5000}
							placeholder="What are you reading or thinking about?"
							onAttachClick={imageInput.openPicker}
							attachDisabled={createMutation.isPending}
							hasPhoto={imageFile !== null}
						/>
					</Field>

					<Field>
						<FieldLabel>Attachment</FieldLabel>
						<PostAttachmentComposePicker
							value={attachment}
							onChange={setAttachment}
							disabled={createMutation.isPending}
						/>
					</Field>

					{imageFile ? (
						<PendingImageAttachment
							variant="post"
							file={imageFile}
							onFileChange={setImageFile}
							disabled={createMutation.isPending}
							inputRef={imageInput.inputRef}
						/>
					) : null}

					<DialogFooter className="border-border border-t p-6 pt-4">
						<LoadingButton
							type="submit"
							loading={createMutation.isPending}
							disabled={content.trim().length < 1}
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
