"use client";

import type { GetPostBySlugOutput } from "@bbrc/api/modules/post/post.schema";
import { PostSchema } from "@bbrc/schemas";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Field, FieldGroup, FieldLabel } from "@bbrc/ui/components/field";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AutoGrowTextarea } from "@/components/blocks/auto-grow-textarea";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { orpc, queryClient } from "@/utils/orpc";

type EditPostFormProps = {
	post: GetPostBySlugOutput;
};

export function EditPostForm({ post }: EditPostFormProps) {
	const router = useRouter();
	const [content, setContent] = useState(post.content);
	const [detachBook, setDetachBook] = useState(false);
	const attachedCoverSrc = post.attachedBook
		? bookCoverUrl(post.attachedBook.coverId)
		: null;

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

				const parsedContent = PostSchema.shape.content.safeParse(
					content.trim(),
				);

				if (!parsedContent.success) {
					toast.error(
						parsedContent.error.issues[0]?.message ??
							"Content must be between 1 and 5000 characters",
					);
					return;
				}

				updateMutation.mutate({
					slug: post.slug,
					content: parsedContent.data,
					...(detachBook ? { attachedBookSlug: null } : {}),
				});
			}}
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="edit-post-content">Content</FieldLabel>
					<AutoGrowTextarea
						id="edit-post-content"
						value={content}
						onChange={(event) => setContent(event.target.value)}
						maxLength={5000}
						required
					/>
				</Field>

				{post.attachedBook ? (
					<Field>
						<FieldLabel>Attached book</FieldLabel>
						<div className="flex items-center gap-3 rounded-none border bg-muted/30 p-3 opacity-100">
							<div className="relative aspect-2/3 w-14 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
								{attachedCoverSrc ? (
									<Image
										src={attachedCoverSrc}
										alt=""
										fill
										className="object-cover"
										sizes="56px"
									/>
								) : null}
							</div>
							<div className="min-w-0 flex-1">
								<p className="font-medium text-sm leading-snug">
									{post.attachedBook.title}
								</p>
								<p className="text-muted-foreground text-sm">
									{formatBookAuthors(post.attachedBook.authors)}
								</p>
							</div>
						</div>
						{/** biome-ignore lint/a11y/noLabelWithoutControl: This needs to be a label */}
						<label className="mt-2 flex items-center gap-2 text-sm">
							<Checkbox
								checked={detachBook}
								onCheckedChange={(checked) => setDetachBook(checked === true)}
							/>
							Remove attached book
						</label>
						<p className="text-muted-foreground text-xs">
							You cannot attach a different book when editing. Remove it here or
							create a new post to link another title.
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
					onClick={() => {
						if (
							!window.confirm(
								"Delete this post? Comments and likes will be removed.",
							)
						) {
							return;
						}

						deleteMutation.mutate({ slug: post.slug });
					}}
				>
					Delete post
				</LoadingButton>
			</div>
		</form>
	);
}
