"use client";

import type { GetPostBySlugOutput } from "@bbrc/api/modules/post/post.schema";
import { contentPlainText } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { PollSettingsEditor } from "@/components/blocks/poll-settings-editor";
import { PostAttachmentCard } from "@/components/blocks/post-attachment-card";
import { usePostDelete } from "@/components/blocks/post-owner-menu";
import {
	type PostSettings,
	PostSettingsFields,
} from "@/components/blocks/post-settings-fields";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { SingleImageUploadField } from "@/components/blocks/single-image-upload-field";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { useLivePoll } from "@/lib/poll/use-poll";
import { postAttachmentLabel } from "@/lib/post-attachment-label";
import { orpc, queryClient } from "@/utils/orpc";

type EditPostFormProps = {
	post: GetPostBySlugOutput;
};

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4 border border-border p-4 sm:p-5">
			<div>
				<h2 className="font-medium text-base">{title}</h2>
				{description ? (
					<p className="mt-0.5 text-muted-foreground text-sm">{description}</p>
				) : null}
			</div>
			{children}
		</section>
	);
}

/** Show the edit in every list and the post page before the server confirms it. */
function patchPostCaches(
	slug: string,
	patch: Partial<
		Pick<
			GetPostBySlugOutput,
			| "content"
			| "isSpoiler"
			| "allowLikes"
			| "allowComments"
			| "allowShares"
			| "editedAt"
		>
	>,
) {
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
					item.slug === slug ? { ...item, ...patch } : item,
				),
			})),
		});
	}
	const detailKey = orpc.post.getPostBySlug.queryKey({ input: slug });
	const detail = queryClient.getQueryData(detailKey);
	const detailSnapshot = detail;
	if (detail) {
		queryClient.setQueryData(detailKey, { ...detail, ...patch });
	}
	return { snapshots, detailKey, detailSnapshot };
}

export function EditPostForm({ post }: EditPostFormProps) {
	const router = useRouter();
	const postHref = `/posts/${post.slug}` as Route;
	const [content, setContent] = useState(post.content);
	const [settings, setSettings] = useState<PostSettings>({
		isSpoiler: post.isSpoiler,
		allowLikes: post.allowLikes,
		allowComments: post.allowComments,
		allowShares: post.allowShares,
	});
	const [detachAttachment, setDetachAttachment] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const hasPoll = post.poll != null;
	const livePoll = useLivePoll(post.slug);

	const updateMutation = useMutation(
		orpc.post.update.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({
					queryKey: orpc.post.getPostList.key(),
				});
				const context = patchPostCaches(post.slug, {
					...(variables.content != null ? { content: variables.content } : {}),
					...(variables.isSpoiler != null
						? { isSpoiler: variables.isSpoiler }
						: {}),
					...(variables.allowLikes != null
						? { allowLikes: variables.allowLikes }
						: {}),
					...(variables.allowComments != null
						? { allowComments: variables.allowComments }
						: {}),
					...(variables.allowShares != null
						? { allowShares: variables.allowShares }
						: {}),
					...(variables.content != null && variables.content !== post.content
						? { editedAt: new Date() }
						: {}),
				});
				toast.success("Post updated.");
				router.push(postHref);
				return context;
			},
			onError: (error, _variables, context) => {
				for (const [key, data] of context?.snapshots ?? []) {
					queryClient.setQueryData(key, data);
				}
				if (context?.detailSnapshot) {
					queryClient.setQueryData(context.detailKey, context.detailSnapshot);
				}
				toast.error(error.message);
			},
			onSettled: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.post.getPostList.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.post.getPostBySlug.key(),
				});
				router.refresh();
			},
		}),
	);

	const deleteMutation = usePostDelete({
		slug: post.slug,
		afterDeleteHref: "/" as Route,
		onStart: () => setDeleteOpen(false),
	});

	function save() {
		if (updateMutation.isPending) return;
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
			isSpoiler: settings.isSpoiler,
			allowLikes: settings.allowLikes,
			allowComments: settings.allowComments,
			allowShares: settings.allowShares,
			...(detachAttachment ? { attachment: null } : {}),
		});
	}

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
			<header className="flex flex-col gap-3">
				<Link
					href={postHref}
					className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" aria-hidden />
					Back to post
				</Link>
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Edit post</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						{hasPoll
							? "Change the question, how people can interact, and the poll rules."
							: "Change the text, the photo or attachment, and how people can interact."}
					</p>
				</div>
			</header>

			<form
				className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
				onSubmit={(event) => {
					event.preventDefault();
					save();
				}}
			>
				<div className="flex min-w-0 flex-col gap-5">
					<Section
						title={hasPoll ? "Question" : "Text"}
						description={
							hasPoll ? "Your text is what the poll asks." : undefined
						}
					>
						<RichTextEditor
							id="edit-post-content"
							instanceKey={post.slug}
							mentionContext={{ postSlug: post.slug }}
							value={content}
							onChange={setContent}
							onSubmitShortcut={save}
							disabled={updateMutation.isPending}
						/>
					</Section>

					{hasPoll ? (
						<Section
							title="Poll"
							description="A poll replaces photos and attachments. Its options and votes stay where they are."
						>
							{livePoll.data ? (
								<PollSettingsEditor poll={livePoll.data} postSlug={post.slug} />
							) : (
								<p className="text-muted-foreground text-sm">Loading poll…</p>
							)}
						</Section>
					) : (
						<Section
							title="Photo and attachment"
							description="One photo, or one attached book, shelf, member or post."
						>
							<SingleImageUploadField
								label="Photo"
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
								<div className="flex flex-col gap-2">
									<p className="font-medium text-sm">Attachment</p>
									<div
										className={
											detachAttachment
												? "pointer-events-none opacity-50"
												: undefined
										}
									>
										<PostAttachmentCard attachment={post.attachment} />
									</div>
									{/** biome-ignore lint/a11y/noLabelWithoutControl: checkbox paired with text */}
									<label className="flex items-center gap-2 text-sm">
										<Checkbox
											checked={detachAttachment}
											onCheckedChange={(checked) =>
												setDetachAttachment(checked === true)
											}
										/>
										Remove attachment ({postAttachmentLabel(post.attachment)})
									</label>
									<p className="text-muted-foreground text-xs">
										You cannot attach something else when editing. Remove it
										here or create a new post to link another resource.
									</p>
								</div>
							) : null}
						</Section>
					)}
				</div>

				<aside className="flex flex-col gap-5 lg:sticky lg:top-20">
					<Section title="Post settings">
						<PostSettingsFields
							value={settings}
							onChange={setSettings}
							disabled={updateMutation.isPending}
						/>
					</Section>

					<div className="flex flex-wrap items-center gap-2">
						<LoadingButton
							type="submit"
							loading={updateMutation.isPending}
							disabled={deleteMutation.isPending}
						>
							Save changes
						</LoadingButton>
						<Button
							render={<Link href={postHref} />}
							nativeButton={false}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
					</div>

					<Section
						title="Delete post"
						description="Comments, likes and any poll votes are removed with it."
					>
						<Button
							type="button"
							variant="destructive"
							className="w-fit"
							disabled={updateMutation.isPending}
							onClick={() => setDeleteOpen(true)}
						>
							Delete post
						</Button>
					</Section>
				</aside>
			</form>

			<DestructiveConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title="Delete post?"
				description="Comments and likes on this post will be removed. This cannot be undone."
				confirmLabel="Delete post"
				onConfirm={() => deleteMutation.mutate({ slug: post.slug })}
			/>
		</div>
	);
}
