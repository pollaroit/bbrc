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
	ChevronDown,
	ImagePlus,
	Link2,
	Plus,
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
import { UserAvatar } from "@/components/blocks/user-avatar";
import { authClient } from "@/lib/auth-client";
import {
	createPendingSlug,
	prependToLists,
	removeFromLists,
	swapListItemSlug,
} from "@/lib/optimistic/infinite-lists";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type ToolButtonProps = {
	icon: React.ReactNode;
	label: string;
	active?: boolean;
	disabled?: boolean;
	reason?: string;
	onClick: () => void;
};

/** One of the "add to your post" buttons. Greyed out with a reason when another one is in use. */
function ToolButton({
	icon,
	label,
	active,
	disabled,
	reason,
	onClick,
}: ToolButtonProps) {
	return (
		<button
			type="button"
			aria-pressed={active}
			disabled={disabled}
			title={disabled ? reason : undefined}
			onClick={onClick}
			className={cn(
				"inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40",
				active
					? "border-foreground bg-foreground text-background"
					: "border-border hover:bg-muted/50",
			)}
		>
			{icon}
			{label}
		</button>
	);
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
	const [settings, setSettings] = useState<PostSettings>(DEFAULT_POST_SETTINGS);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [attachment, setAttachment] =
		useState<PostAttachmentComposeValue>(null);
	const [attachmentOpen, setAttachmentOpen] = useState(false);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [pollOn, setPollOn] = useState(false);
	const [pollDraft, setPollDraft] = useState<PollDraft>(emptyPollDraft);
	const imageInput = usePendingImageInput(setImageFile, { variant: "post" });

	useEffect(() => {
		if (open && initialAttachment) {
			setAttachment(initialAttachment);
		}
	}, [open, initialAttachment]);

	function reset() {
		setContent("");
		setSettings(DEFAULT_POST_SETTINGS);
		setSettingsOpen(false);
		setAttachment(null);
		setAttachmentOpen(false);
		setImageFile(null);
		setPollOn(false);
		setPollDraft(emptyPollDraft());
		if (imageInput.inputRef.current) {
			imageInput.inputRef.current.value = "";
		}
	}

	const postListKey = orpc.post.getPostList.key();
	const hasMedia = imageFile != null || attachment != null;
	const plain = contentPlainText(content).trim();
	const pollProblem = pollOn ? pollDraftProblem(pollDraft) : null;

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
		if (plain.length < 1) {
			toast.error("Write something first.");
			return;
		}
		if (plain.length > 5000) {
			toast.error("Content must be at most 5000 characters");
			return;
		}
		if (pollProblem) {
			toast.error(pollProblem);
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
							disabled={false}
							placeholder={
								pollOn
									? "Ask your question…"
									: "What are you reading or thinking about?"
							}
						/>

						<div
							className="flex flex-wrap items-center gap-2"
							role="toolbar"
							aria-label="Add to your post"
						>
							<span className="pe-1 text-muted-foreground text-xs">Add</span>
							<ToolButton
								icon={<ImagePlus className="size-4" aria-hidden />}
								label={imageFile ? "Change photo" : "Photo"}
								active={imageFile != null}
								disabled={pollOn}
								reason="A poll replaces photos and attachments."
								onClick={imageInput.openPicker}
							/>
							<ToolButton
								icon={<Link2 className="size-4" aria-hidden />}
								label="Attachment"
								active={attachmentOpen || attachment != null}
								disabled={pollOn}
								reason="A poll replaces photos and attachments."
								onClick={() => setAttachmentOpen((current) => !current)}
							/>
							<ToolButton
								icon={<BarChart3 className="size-4" aria-hidden />}
								label="Poll"
								active={pollOn}
								disabled={hasMedia}
								reason="Remove the photo or attachment to add a poll."
								onClick={() => {
									setPollOn((current) => !current);
									setAttachmentOpen(false);
								}}
							/>
						</div>

						{imageFile ? (
							<PendingImageAttachment
								variant="post"
								file={imageFile}
								onFileChange={setImageFile}
								disabled={false}
								inputRef={imageInput.inputRef}
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

						<div className="flex flex-col gap-2">
							<button
								type="button"
								aria-expanded={settingsOpen}
								onClick={() => setSettingsOpen((current) => !current)}
								className="flex w-fit items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
							>
								<Settings2 className="size-4" aria-hidden />
								Post settings
								{customSettings ? (
									<span className="text-foreground text-xs">· changed</span>
								) : null}
								<ChevronDown
									className={cn(
										"size-4 transition-transform",
										settingsOpen && "rotate-180",
									)}
									aria-hidden
								/>
							</button>
							{settingsOpen ? (
								<PostSettingsFields value={settings} onChange={setSettings} />
							) : null}
						</div>
					</div>

					<DialogFooter className="flex-row items-center justify-between gap-3 border-border border-t px-5 py-3 sm:justify-between">
						<p
							className={cn(
								"min-w-0 truncate text-xs",
								pollProblem ? "text-destructive" : "text-muted-foreground",
							)}
							aria-live="polite"
						>
							{pollProblem ?? (plain.length > 0 ? `${plain.length}/5000` : "")}
						</p>
						<div className="flex shrink-0 items-center gap-2">
							<Button
								type="button"
								variant="ghost"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<LoadingButton
								type="submit"
								loading={false}
								disabled={plain.length < 1 || pollProblem != null}
							>
								Post
							</LoadingButton>
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
