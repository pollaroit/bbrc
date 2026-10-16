"use client";

import type { GetPostBySlugOutput } from "@bbrc/api/modules/post/post.schema";
import { contentPlainText } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Field, FieldGroup, FieldLabel } from "@bbrc/ui/components/field";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PostAttachmentCard } from "@/components/blocks/post-attachment-card";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { SingleImageUploadField } from "@/components/blocks/single-image-upload-field";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { postAttachmentLabel } from "@/lib/post-attachment-label";
import { orpc, queryClient } from "@/utils/orpc";

type EditPostFormProps = {
	post: GetPostBySlugOutput;
};

export function EditPostForm({ post }: EditPostFormProps) {
	const router = useRouter();
	const [content, setContent] = useState(post.content);
	const [isSpoiler, setIsSpoiler] = useState(post.isSpoiler);
	const [detachAttachment, setDetachAttachment] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const updateMutation = useMutation(
		orpc.post.update.mutationOptions({
			onSuccess: async () => {
				toast.success("Post updated.");
				await queryClient.invalidateQueries({
					queryKey: orpc.post.getPostList.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.post.getPostBySlug.key(),
				});
				router.push(`/posts/${post.slug}` as Route);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteMutation = useMutation(
		orpc.post.delete.mutationOptions({
			onSuccess: async () => {
				setDeleteOpen(false);
				toast.success("Post deleted.");
				await queryClient.invalidateQueries({
					queryKey: orpc.post.getPostList.key(),
				});
				router.push("/" as Route);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<form
			className="flex max-w-xl flex-col gap-6"
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

				updateMutation.mutate({
					slug: post.slug,
					content,
					isSpoiler,
					...(detachAttachment ? { attachment: null } : {}),
				});
			}}
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="edit-post-content">Content</FieldLabel>
					<RichTextEditor
						id="edit-post-content"
						instanceKey={post.slug}
						value={content}
						onChange={setContent}
						disabled={updateMutation.isPending}
					/>
				</Field>

				<Field>
					<div className="flex items-center gap-2">
						<Checkbox
							id="edit-post-spoiler"
							checked={isSpoiler}
							onCheckedChange={(checked) => setIsSpoiler(checked === true)}
							disabled={updateMutation.isPending}
						/>
						<FieldLabel htmlFor="edit-post-spoiler" className="mb-0">
							Mark entire post as spoiler
						</FieldLabel>
					</div>
				</Field>

				<SingleImageUploadField
					label="Post image"
					description="Optional. JPEG, PNG, or WebP up to 2 MB."
					currentUrl={post.imageUrl}
					uploadTarget={{
						target: "post-image",
						postSlug: post.slug,
					}}
					onRemove={async () => {
						await orpc.storage.removePostImage.call({
							postSlug: post.slug,
						});
					}}
					onSuccess={async () => {
						await queryClient.invalidateQueries({
							queryKey: orpc.post.getPostBySlug.key(),
						});
						await queryClient.invalidateQueries({
							queryKey: orpc.post.getPostList.key(),
						});
						router.refresh();
					}}
				/>

				{post.attachment ? (
					<Field>
						<FieldLabel>Attachment</FieldLabel>
						<div
							className={
								detachAttachment ? "pointer-events-none opacity-50" : undefined
							}
						>
							<PostAttachmentCard attachment={post.attachment} />
						</div>
						{/** biome-ignore lint/a11y/noLabelWithoutControl: checkbox paired with text */}
						<label className="mt-2 flex items-center gap-2 text-sm">
							<Checkbox
								checked={detachAttachment}
								onCheckedChange={(checked) =>
									setDetachAttachment(checked === true)
								}
							/>
							Remove attachment ({postAttachmentLabel(post.attachment)})
						</label>
						<p className="text-muted-foreground text-xs">
							You cannot attach something else when editing. Remove it here or
							create a new post to link another resource.
						</p>
					</Field>
				) : null}
			</FieldGroup>

			<div className="flex flex-wrap items-center gap-3">
				<LoadingButton
					type="submit"
					loading={updateMutation.isPending}
					disabled={deleteMutation.isPending}
				>
					Save changes
				</LoadingButton>
				<Button
					render={<Link href={`/posts/${post.slug}` as Route} />}
					nativeButton={false}
					type="button"
					variant="outline"
				>
					Cancel
				</Button>
				<LoadingButton
					type="button"
					variant="destructive"
					className="ms-auto"
					loading={deleteMutation.isPending}
					disabled={updateMutation.isPending}
					onClick={() => setDeleteOpen(true)}
				>
					Delete post
				</LoadingButton>
			</div>

			<DestructiveConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title="Delete post?"
				description="Comments and likes on this post will be removed. This cannot be undone."
				confirmLabel="Delete post"
				loading={deleteMutation.isPending}
				onConfirm={() => deleteMutation.mutate({ slug: post.slug })}
			/>
		</form>
	);
}
