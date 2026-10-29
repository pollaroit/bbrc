"use client";

import type { PostAttachmentInput } from "@bbrc/api/modules/post/post-attachment.schema";
import { contentPlainText } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import {
	BarChart3,
	ImagePlus,
	Link2,
	Plus,
	Rows3,
	Settings2,
} from "lucide-react";
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
	emptyPollDraft,
	PollBuilder,
	type PollDraft,
	pollDraftProblem,
	pollDraftToInput,
	pollDraftToPreview,
} from "@/components/blocks/poll-builder";
import {
	PostAttachmentComposePicker,
	type PostAttachmentComposeValue,
} from "@/components/blocks/post-attachment-compose-picker";
import {
	DEFAULT_POST_SETTINGS,
	type PostSettings,
	PostSettingsFields,
} from "@/components/blocks/post-settings-fields";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { uploadImageForEntity } from "@/components/blocks/single-image-upload-field";
import { SubmitShortcutHint } from "@/components/blocks/submit-shortcut-hint";
import { TierlistBuilder } from "@/components/blocks/tierlist-builder";
import { ToolButton } from "@/components/blocks/tool-button";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { authClient } from "@/lib/auth-client";
import {
	createPendingSlug,
	prependToLists,
	removeFromLists,
	swapListItemSlug,
} from "@/lib/optimistic/infinite-lists";
import {
	emptyTierlistDraft,
	type TierlistDraft,
	tierlistDraftProblem,
	tierlistDraftToInput,
	tierlistDraftToView,
} from "@/lib/tierlist/draft";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type ComposePostDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialAttachment?: PostAttachmentInput | null;
	/** Serialized rich text to start the post with. */
	initialContent?: string | null;
	onClosed?: () => void;
};

export function ComposePostDialog({
	open,
	onOpenChange,
	initialAttachment = null,
	initialContent = null,
	onClosed,
}: ComposePostDialogProps) {
	const router = useRouter();
	const pathname = usePathname();
	const { data: session } = authClient.useSession();
	const [content, setContent] = useState("");
	const [settings, setSettings] = useState<PostSettings>(DEFAULT_POST_SETTINGS);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [attachment, setAttachment] =
		useState<PostAttachmentComposeValue>(null);
	const [attachmentOpen, setAttachmentOpen] = useState(false);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [pollOn, setPollOn] = useState(false);
	const [pollDraft, setPollDraft] = useState<PollDraft>(emptyPollDraft);
	const [tierlistOn, setTierlistOn] = useState(false);
	const [tierlistDraft, setTierlistDraft] =
		useState<TierlistDraft>(emptyTierlistDraft);
	const imageInput = usePendingImageInput(setImageFile, { variant: "post" });

	useEffect(() => {
		if (open && initialAttachment) {
			setAttachment(initialAttachment);
		}
		if (open && initialContent) {
			setContent(initialContent);
		}
	}, [open, initialAttachment, initialContent]);

	function reset() {
		setContent("");
		setSettings(DEFAULT_POST_SETTINGS);
		setSettingsOpen(false);
		setAttachment(null);
		setAttachmentOpen(false);
		setImageFile(null);
		setPollOn(false);
		setPollDraft(emptyPollDraft());
		setTierlistOn(false);
		setTierlistDraft(emptyTierlistDraft());
		if (imageInput.inputRef.current) {
			imageInput.inputRef.current.value = "";
		}
	}

	const postListKey = orpc.post.getPostList.key();
	const hasMedia = imageFile != null || attachment != null;
	const plain = contentPlainText(content).trim();
	const pollProblem = pollOn ? pollDraftProblem(pollDraft) : null;
	const tierlistProblem = tierlistOn
		? tierlistDraftProblem(tierlistDraft)
		: null;
	const problem = pollProblem ?? tierlistProblem;

	const createMutation = useMutation(
		orpc.post.create.mutationOptions({
			// Posts are created one after another, in the order they were sent.
			scope: { id: "post-create" },
			onMutate: async (variables) => {
				const user = session?.user;
				const pendingSlug = createPendingSlug();
				const draft = {
					content,
					settings,
					attachment,
					imageFile,
					pollOn,
					pollDraft,
					tierlistOn,
					tierlistDraft,
				};
				const submittedFrom = pathname;

				await queryClient.cancelQueries({ queryKey: postListKey });

				if (user) {
					const author = {
						username: user.username as string,
						name: user.name,
						image: user.image ?? null,
					};
					prependToLists(
						postListKey,
						{
							slug: pendingSlug,
							content: variables.content,
							imageUrl: null,
							isSpoiler: Boolean(variables.isSpoiler),
							allowLikes: variables.allowLikes ?? true,
							allowComments: variables.allowComments ?? true,
							allowShares: variables.allowShares ?? true,
							createdAt: new Date(),
							editedAt: null,
							author,
							attachment: null,
							poll: draft.pollOn
								? pollDraftToPreview(draft.pollDraft, author)
								: null,
							tierlist: draft.tierlistOn
								? tierlistDraftToView(draft.tierlistDraft)
								: null,
							likeCount: 0,
							commentCount: 0,
							likedByMe: false,
							topComments: [],
						},
						// Every feed the post belongs in, whatever it is sorted by.
						(input) =>
							(input.authorUsername == null ||
								input.authorUsername === user.username) &&
							input.hasAttachedBook == null &&
							input.search == null,
					);
				}

				// Close the composer at once; the draft returns if this fails.
				reset();
				onOpenChange(false);

				return { pendingSlug, draft, submittedFrom };
			},
			onError: (error, _variables, context) => {
				if (context) {
					removeFromLists(postListKey, context.pendingSlug);
					setContent(context.draft.content);
					setSettings(context.draft.settings);
					setAttachment(context.draft.attachment);
					setImageFile(context.draft.imageFile);
					setPollOn(context.draft.pollOn);
					setPollDraft(context.draft.pollDraft);
					setTierlistOn(context.draft.tierlistOn);
					setTierlistDraft(context.draft.tierlistDraft);
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

	function submit() {
		if (createMutation.isPending) return;
		if (plain.length < 1) {
			toast.error("Write something first.");
			return;
		}
		if (plain.length > 5000) {
			toast.error("Content must be at most 5000 characters");
			return;
		}
		if (problem) {
			toast.error(problem);
			return;
		}

		createMutation.mutate({
			content,
			isSpoiler: settings.isSpoiler,
			allowLikes: settings.allowLikes,
			allowComments: settings.allowComments,
			allowShares: settings.allowShares,
			...(pollOn
				? { poll: pollDraftToInput(pollDraft) }
				: tierlistOn
					? { tierlist: tierlistDraftToInput(tierlistDraft) }
					: attachment
						? { attachment }
						: {}),
		});
	}

	const user = session?.user;
	const customSettings =
		settings.isSpoiler ||
		!settings.allowLikes ||
		!settings.allowComments ||
		!settings.allowShares;

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);
				if (!nextOpen) {
					reset();
					onClosed?.();
				}
			}}
		>
			<DialogContent className="flex max-h-[min(92vh,820px)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
				<DialogHeader className="flex-row items-center gap-3 border-border border-b px-5 py-4">
					{user ? (
						<UserAvatar
							user={{ name: user.name, image: user.image ?? null }}
							className="size-9"
						/>
					) : null}
					<div className="flex min-w-0 flex-col gap-0.5 text-start">
						<DialogTitle className="text-base">New post</DialogTitle>
						<DialogDescription className="truncate text-xs">
							{pollOn
								? "Your text is the question. Add the options below."
								: tierlistOn
									? "Your text is the title. Build the tierlist below."
									: "Share an update with the club."}
						</DialogDescription>
					</div>
				</DialogHeader>

				<form
					className="flex min-h-0 flex-1 flex-col"
					onSubmit={(event) => {
						event.preventDefault();
						submit();
					}}
				>
					<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
						{imageInput.input}
						{imageInput.cropDialog}

						<RichTextEditor
							instanceKey={open ? "compose-open" : "compose-closed"}
							id="compose-post-content"
							value={content}
							onChange={setContent}
							onSubmitShortcut={submit}
							disabled={false}
							placeholder={
								pollOn
									? "Ask your question…"
									: tierlistOn
										? "Name your tierlist…"
										: "What are you reading or thinking about?"
							}
						/>

						{imageFile ? (
							<PendingImageAttachment
								variant="post"
								file={imageFile}
								onFileChange={setImageFile}
								disabled={false}
								inputRef={imageInput.inputRef}
								bleed={false}
								size="compact"
							/>
						) : null}

						{attachmentOpen || attachment ? (
							<PostAttachmentComposePicker
								value={attachment}
								onChange={setAttachment}
								disabled={false}
							/>
						) : null}

						{pollOn ? (
							<PollBuilder draft={pollDraft} onChange={setPollDraft} />
						) : null}

						{tierlistOn ? (
							<>
								<TierlistBuilder
									draft={tierlistDraft}
									onChange={setTierlistDraft}
								/>
								<p className="text-muted-foreground text-xs">
									A tierlist cannot be changed after you post it.
								</p>
							</>
						) : null}

						{settingsOpen ? (
							<PostSettingsFields value={settings} onChange={setSettings} />
						) : null}
					</div>

					<DialogFooter className="flex-col gap-2 border-border border-t px-5 py-3 sm:flex-col sm:items-stretch">
						{problem ? (
							<p className="text-destructive text-xs" aria-live="polite">
								{problem}
							</p>
						) : null}
						<div className="flex items-center justify-between gap-3">
							<div
								className="flex items-center gap-1"
								role="toolbar"
								aria-label="Add to your post"
							>
								<ToolButton
									icon={<ImagePlus className="size-[18px]" aria-hidden />}
									label={imageFile ? "Change photo" : "Add a photo"}
									active={imageFile != null}
									disabled={pollOn || tierlistOn}
									reason="A poll or tierlist replaces photos and attachments."
									onClick={imageInput.openPicker}
								/>
								<ToolButton
									icon={<Link2 className="size-[18px]" aria-hidden />}
									label="Attach a book, shelf or member"
									active={attachmentOpen || attachment != null}
									disabled={pollOn || tierlistOn}
									reason="A poll or tierlist replaces photos and attachments."
									onClick={() => setAttachmentOpen((current) => !current)}
								/>
								<ToolButton
									icon={<BarChart3 className="size-[18px]" aria-hidden />}
									label="Add a poll"
									active={pollOn}
									disabled={hasMedia || tierlistOn}
									reason={
										tierlistOn
											? "A post has either a poll or a tierlist."
											: "Remove the photo or attachment to add a poll."
									}
									onClick={() => {
										setPollOn((current) => !current);
										setAttachmentOpen(false);
									}}
								/>
								<ToolButton
									icon={<Rows3 className="size-[18px]" aria-hidden />}
									label="Add a tierlist"
									active={tierlistOn}
									disabled={hasMedia || pollOn}
									reason={
										pollOn
											? "A post has either a poll or a tierlist."
											: "Remove the photo or attachment to add a tierlist."
									}
									onClick={() => {
										setTierlistOn((current) => !current);
										setAttachmentOpen(false);
									}}
								/>
								<span className="mx-1 h-5 w-px bg-border" aria-hidden />
								<ToolButton
									icon={<Settings2 className="size-[18px]" aria-hidden />}
									label={
										customSettings ? "Post settings (changed)" : "Post settings"
									}
									active={settingsOpen || customSettings}
									onClick={() => setSettingsOpen((current) => !current)}
								/>
							</div>
							<div className="flex shrink-0 items-center gap-3">
								<span className="hidden text-muted-foreground text-xs tabular-nums sm:inline">
									{plain.length > 0 ? `${plain.length}/5000` : ""}
								</span>
								<SubmitShortcutHint />
								<LoadingButton
									type="submit"
									loading={false}
									disabled={plain.length < 1 || problem != null}
								>
									Post
								</LoadingButton>
							</div>
						</div>
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
