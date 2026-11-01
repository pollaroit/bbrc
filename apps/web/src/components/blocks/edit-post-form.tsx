"use client";

import type { GetPostBySlugOutput } from "@bbrc/api/modules/post/post.schema";
import {
	type ContentMapSnapshot,
	contentPlainText,
	postAttachmentConflict,
	type Visibility,
	validateContentMap,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { ContentMapPicker } from "@/components/blocks/content-map/content-map-picker";
import { ContentMapView } from "@/components/blocks/content-map/content-map-view";
import { PollSettingsEditor } from "@/components/blocks/poll-settings-editor";
import { PostAttachmentCard } from "@/components/blocks/post-attachment-card";
import { usePostDelete } from "@/components/blocks/post-owner-menu";
import {
	defaultPostScheduleSlot,
	PostScheduleField,
} from "@/components/blocks/post-schedule-field";
import { PostScheduledBanner } from "@/components/blocks/post-scheduled-banner";
import {
	type PostSettings,
	PostSettingsFields,
} from "@/components/blocks/post-settings-fields";
import { PostTierlist } from "@/components/blocks/post-tierlist";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { SingleImageUploadField } from "@/components/blocks/single-image-upload-field";
import { VisibilitySelect } from "@/components/blocks/visibility-select";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { useLivePoll } from "@/lib/poll/use-poll";
import { postAttachmentLabel } from "@/lib/post-attachment-label";
import { orpc, queryClient } from "@/utils/orpc";

type EditPostFormProps = {
	post: GetPostBySlugOutput;
};

function snapshotFromPostMap(
	map: GetPostBySlugOutput["map"],
): ContentMapSnapshot | null {
	if (!map) return null;
	return {
		centerLng: map.centerLng,
		centerLat: map.centerLat,
		zoom: map.zoom,
		markerLng: map.markerLng,
		markerLat: map.markerLat,
	};
}

function mapsEqual(
	a: ContentMapSnapshot | null,
	b: ContentMapSnapshot | null,
): boolean {
	if (a == null && b == null) return true;
	if (a == null || b == null) return false;
	return (
		a.centerLng === b.centerLng &&
		a.centerLat === b.centerLat &&
		a.zoom === b.zoom &&
		a.markerLng === b.markerLng &&
		a.markerLat === b.markerLat
	);
}

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
			| "allowBookmarks"
			| "visibility"
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
	const isScheduled = post.status === "scheduled";
	const postHref = `/posts/${post.slug}` as Route;
	const backHref = isScheduled
		? (`/users/${post.author.username}/posts/scheduled` as Route)
		: postHref;
	const [content, setContent] = useState(post.content);
	const [settings, setSettings] = useState<PostSettings>({
		isSpoiler: post.isSpoiler,
		allowLikes: post.allowLikes,
		allowComments: post.allowComments,
		allowShares: post.allowShares,
		allowBookmarks: post.allowBookmarks,
	});
	const [visibility, setVisibility] = useState<Visibility>(post.visibility);
	const [detachAttachment, setDetachAttachment] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const initialMap = snapshotFromPostMap(post.map);
	const [mapDraft, setMapDraft] = useState<ContentMapSnapshot | null>(
		initialMap,
	);
	const [mapPickerOpen, setMapPickerOpen] = useState(false);
	const [scheduledAt, setScheduledAt] = useState(() =>
		post.scheduledAt ? new Date(post.scheduledAt) : defaultPostScheduleSlot(),
	);
	const hasPoll = post.poll != null;
	const hasTierlist = post.tierlist != null;
	const hasPhoto = post.imageUrl != null;
	const livePoll = useLivePoll(post.slug);
	const mapChanged = !mapsEqual(mapDraft, initialMap);
	const scheduleChanged =
		isScheduled &&
		post.scheduledAt != null &&
		scheduledAt.getTime() !== new Date(post.scheduledAt).getTime();

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
					...(variables.allowBookmarks != null
						? { allowBookmarks: variables.allowBookmarks }
						: {}),
					...(variables.visibility != null
						? { visibility: variables.visibility }
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

		if (!hasPoll && !hasTierlist) {
			const conflict = postAttachmentConflict({
				attachment: post.attachment != null && !detachAttachment,
				image: hasPhoto,
				map: mapDraft != null,
			});
			if (conflict) {
				toast.error(conflict);
				return;
			}
			if (mapDraft) {
				const mapProblem = validateContentMap(mapDraft);
				if (mapProblem) {
					toast.error(mapProblem);
					return;
				}
			}
		}

		updateMutation.mutate({
			slug: post.slug,
			content,
			isSpoiler: settings.isSpoiler,
			allowLikes: settings.allowLikes,
			allowComments: settings.allowComments,
			allowShares: settings.allowShares,
			allowBookmarks: settings.allowBookmarks,
			visibility,
			...(detachAttachment ? { attachment: null } : {}),
			...(mapChanged ? { map: mapDraft } : {}),
			...(scheduleChanged ? { scheduledAt } : {}),
		});
	}

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
			<header className="flex flex-col gap-3">
				<Link
					href={backHref}
					className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" aria-hidden />
					{isScheduled ? "Scheduled posts" : "Back to post"}
				</Link>
				{isScheduled ? (
					<PostScheduledBanner
						slug={post.slug}
						authorUsername={post.author.username}
						scheduledAt={post.scheduledAt ?? null}
						compact
					/>
				) : null}
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">
						{isScheduled ? "Edit scheduled post" : "Edit post"}
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						{hasPoll
							? "Change the question, how people can interact, and the poll rules."
							: hasTierlist
								? "Change the text and how people can interact. The tierlist itself is final."
								: "Change the text, map, photo or attachment, and how people can interact."}
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
						title={hasPoll ? "Question" : hasTierlist ? "Title" : "Text"}
						description={
							hasPoll
								? "Your text is what the poll asks."
								: hasTierlist
									? "Your text is the title of the tierlist."
									: undefined
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
					) : hasTierlist ? (
						<Section
							title="Tierlist"
							description="A tierlist cannot be changed once it is posted. Delete the post to make a new one."
						>
							{post.tierlist ? (
								<PostTierlist tierlist={post.tierlist} compact />
							) : null}
						</Section>
					) : (
						<Section
							title="Photo and attachment"
							description="One photo, or one attached book, shelf, member or post. Not together with a map."
						>
							<SingleImageUploadField
								label="Photo"
								description={
									mapDraft
										? "Remove the map to add or change a photo."
										: "Optional. JPEG, PNG, or WebP up to 2 MB."
								}
								currentUrl={post.imageUrl}
								disabled={mapDraft != null}
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

					{!hasPoll && !hasTierlist ? (
						<Section
							title="Map"
							description="Optional. Pan to the area you mean; tap to drop a pin, or save without one."
						>
							{mapDraft ? (
								<ContentMapView map={mapDraft} height={240} />
							) : (
								<p className="text-muted-foreground text-sm">
									No map on this post yet.
								</p>
							)}
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									className="gap-1.5"
									disabled={
										updateMutation.isPending || (hasPhoto && mapDraft == null)
									}
									onClick={() => setMapPickerOpen(true)}
								>
									<MapPin className="size-4" aria-hidden />
									{mapDraft ? "Change map" : "Add a map"}
								</Button>
								{mapDraft ? (
									<Button
										type="button"
										variant="ghost"
										disabled={updateMutation.isPending}
										onClick={() => setMapDraft(null)}
									>
										Remove map
									</Button>
								) : null}
							</div>
							{hasPhoto && mapDraft == null ? (
								<p className="text-muted-foreground text-xs">
									Remove the photo first if you want a map instead.
								</p>
							) : null}
						</Section>
					) : null}
				</div>

				<aside className="flex flex-col gap-5 lg:sticky lg:top-20">
					{isScheduled ? (
						<Section
							title="Publish time"
							description="Whole hours in club time. You can move it earlier or later within the first month."
						>
							<PostScheduleField
								value={scheduledAt}
								onChange={setScheduledAt}
								firstScheduledAt={post.firstScheduledAt ?? null}
							/>
						</Section>
					) : null}

					<Section title="Who can see it">
						<VisibilitySelect
							value={visibility}
							onChange={setVisibility}
							disabled={updateMutation.isPending}
							label="Who can see this post"
							className="w-fit"
						/>
					</Section>

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

			{!hasPoll && !hasTierlist ? (
				<ContentMapPicker
					open={mapPickerOpen}
					onOpenChange={setMapPickerOpen}
					value={mapDraft}
					onChange={setMapDraft}
				/>
			) : null}
		</div>
	);
}
