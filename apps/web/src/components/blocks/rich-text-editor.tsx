"use client";

import { contentPlainText, RICH_CONTENT_MAX_PLAIN_CHARS } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
	type Editor,
	EditorContent,
	useEditor,
	useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	Bold,
	ExternalLink,
	Globe,
	Heading1,
	Italic,
	Link2,
	PanelTop,
	Pencil,
	Quote,
	Underline as UnderlineIcon,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MentionPicker } from "@/components/blocks/mention/mention-picker";
import {
	RichTextLinkDialog,
	type RichTextLinkDialogResult,
} from "@/components/blocks/rich-text-link-dialog";
import {
	describeExternalUrl,
	internalRefOf,
	toSitePath,
} from "@/lib/link-preview/site-path";
import { useLinkPreview } from "@/lib/link-preview/use-link-preview";
import {
	EMPTY_TIPTAP_DOC,
	storedContentToTiptapJson,
	tiptapJsonToStoredContent,
} from "@/lib/rich-content-tiptap";
import { isAllowedRichLinkHref } from "@/lib/rich-link";
import { LinkCard } from "@/lib/tiptap-link-card";
import { Mention, type MentionPickerRequest } from "@/lib/tiptap-mention";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
	id?: string;
	/** Remount editor when editing a different document (post slug, comment slug, etc.). */
	instanceKey?: string;
	value: string;
	onChange: (stored: string) => void;
	placeholder?: string;
	disabled?: boolean;
	maxPlainLength?: number;
	className?: string;
	minHeightClassName?: string;
	autoFocus?: boolean;
	/** Runs on ⌘/Ctrl + Enter, e.g. to post a comment. */
	onSubmitShortcut?: () => void;
	/** Typing "@" offers members to mention (off for places that never notify, like a bio). */
	enableMentions?: boolean;
	/** What is being written on, so its author and commenters are suggested first. */
	mentionContext?: { postSlug?: string; feedbackSlug?: string };
};

function initialEditorDoc(stored: string) {
	const trimmed = stored.trim();
	if (!trimmed) {
		return EMPTY_TIPTAP_DOC;
	}
	if (trimmed.startsWith('{"v":1')) {
		return storedContentToTiptapJson(stored);
	}
	if (contentPlainText(stored).trim().length === 0) {
		return EMPTY_TIPTAP_DOC;
	}
	return storedContentToTiptapJson(stored);
}

function ToolbarButton({
	label,
	active,
	disabled,
	onClick,
	children,
}: {
	label: string;
	active?: boolean;
	disabled?: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<Button
			type="button"
			variant={active ? "secondary" : "ghost"}
			size="icon-sm"
			className="size-8 shrink-0"
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</Button>
	);
}

/** Shows where the link under the cursor goes, with the things you usually want to do next. */
function LinkContextBar({
	editor,
	onEdit,
}: {
	editor: Editor;
	onEdit: () => void;
}) {
	const { active, href } = useEditorState({
		editor,
		selector: (ctx) => ({
			active: ctx.editor.isActive("link"),
			href: (ctx.editor.getAttributes("link").href as string | undefined) ?? "",
		}),
	});
	const ref = internalRefOf(href);
	const preview = useLinkPreview(ref, { enabled: active && ref != null });

	if (!active || !href) {
		return null;
	}

	const external = ref == null;
	const site = toSitePath(href);
	const { host, path } = external
		? describeExternalUrl(href)
		: { host: "", path: "" };
	const title =
		preview.data?.status === "ok" ? preview.data.title : external ? host : site;
	const subtitle =
		preview.data?.status === "ok"
			? preview.data.kindLabel
			: external
				? path || "Web link"
				: "On BBRC";

	function turnIntoCard() {
		editor.chain().focus().extendMarkRange("link").run();
		const { from, to } = editor.state.selection;
		const text = editor.state.doc.textBetween(from, to, " ");
		const $from = editor.state.selection.$from;
		const card = { type: "linkCard", attrs: { href, label: text || title } };

		if ($from.parent.textContent.trim() === text.trim()) {
			// The link is the whole line: the card replaces it.
			editor
				.chain()
				.focus()
				.insertContentAt({ from: $from.before(), to: $from.after() }, card)
				.run();
			return;
		}
		// Link inside a sentence: keep the sentence, add the card after it.
		editor
			.chain()
			.focus()
			.unsetLink()
			.insertContentAt($from.after(), card)
			.run();
	}

	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-border border-b bg-muted/30 px-2.5 py-1.5 text-xs">
			<span className="flex min-w-0 flex-1 items-center gap-2">
				{external ? (
					<Globe
						className="size-3.5 shrink-0 text-muted-foreground"
						aria-hidden
					/>
				) : (
					<Link2
						className="size-3.5 shrink-0 text-muted-foreground"
						aria-hidden
					/>
				)}
				<span className="truncate font-medium">{title}</span>
				<span className="hidden truncate text-muted-foreground sm:inline">
					{subtitle}
				</span>
			</span>
			<span className="flex shrink-0 items-center gap-0.5">
				<Button
					type="button"
					size="xs"
					variant="ghost"
					onClick={turnIntoCard}
					title="Show this link as a preview card"
				>
					<PanelTop data-icon="inline-start" aria-hidden />
					Card
				</Button>
				<Button
					type="button"
					size="xs"
					variant="ghost"
					onClick={onEdit}
					title="Edit link"
				>
					<Pencil data-icon="inline-start" aria-hidden />
					Edit
				</Button>
				<Button
					type="button"
					size="icon-xs"
					variant="ghost"
					aria-label="Open link in a new tab"
					title="Open link"
					render={
						<a
							href={external ? href : site}
							target="_blank"
							rel="noopener noreferrer"
						/>
					}
					nativeButton={false}
				>
					<ExternalLink className="size-3.5" aria-hidden />
				</Button>
				<Button
					type="button"
					size="icon-xs"
					variant="ghost"
					aria-label="Remove link"
					title="Remove link"
					onClick={() =>
						editor.chain().focus().extendMarkRange("link").unsetLink().run()
					}
				>
					<X className="size-3.5" aria-hidden />
				</Button>
			</span>
		</div>
	);
}

export function RichTextEditor({
	id,
	instanceKey = "default",
	value,
	onChange,
	placeholder = "Write something…",
	disabled = false,
	maxPlainLength = RICH_CONTENT_MAX_PLAIN_CHARS,
	className,
	minHeightClassName = "min-h-[8rem]",
	autoFocus = false,
	onSubmitShortcut,
	enableMentions = true,
	mentionContext,
}: RichTextEditorProps) {
	const [linkDialogOpen, setLinkDialogOpen] = useState(false);
	const [mentionRequest, setMentionRequest] =
		useState<MentionPickerRequest | null>(null);
	const mentionKeyHandler = useRef<((event: KeyboardEvent) => boolean) | null>(
		null,
	);
	const openLinkDialogRef = useRef<() => void>(() => {});
	openLinkDialogRef.current = () => setLinkDialogOpen(true);

	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const onSubmitShortcutRef = useRef(onSubmitShortcut);
	onSubmitShortcutRef.current = onSubmitShortcut;

	const valueRef = useRef(value);
	valueRef.current = value;

	const suppressOnChangeRef = useRef(false);

	const editor = useEditor(
		{
			immediatelyRender: false,
			editable: !disabled,
			extensions: [
				StarterKit.configure({
					heading: { levels: [1] },
					blockquote: {},
					link: false,
					underline: false,
				}),
				Underline,
				LinkExtension.configure({
					openOnClick: false,
					autolink: true,
					defaultProtocol: "https",
					protocols: ["https"],
					validate: (href) => isAllowedRichLinkHref(href),
					shouldAutoLink: (url) => url.startsWith("https://"),
					HTMLAttributes: {
						class:
							"text-primary underline decoration-primary/40 decoration-1 underline-offset-[3px]",
					},
				}),
				LinkCard,
				...(enableMentions
					? [
							Mention.configure({
								onPicker: setMentionRequest,
								keyHandler: mentionKeyHandler,
							}),
						]
					: []),
				Placeholder.configure({ placeholder }),
			],
			content: initialEditorDoc(value),
			editorProps: {
				// Before the editor's own keymap, which would insert a hard break.
				handleKeyDown: (_view, event) => {
					if (
						event.key === "Enter" &&
						(event.metaKey || event.ctrlKey) &&
						onSubmitShortcutRef.current
					) {
						event.preventDefault();
						onSubmitShortcutRef.current();
						return true;
					}
					return false;
				},
				attributes: {
					...(id ? { id } : {}),
					class: cn(
						"max-w-none px-3 py-2 text-sm leading-relaxed focus:outline-none",
						minHeightClassName,
						"[&_blockquote]:border-border [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h1]:font-semibold [&_h1]:text-lg",
						"[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-1 [&_a]:decoration-primary/40 [&_a]:underline-offset-[3px]",
					),
				},
			},
			onUpdate: ({ editor: instance }) => {
				if (suppressOnChangeRef.current) {
					return;
				}
				onChangeRef.current(tiptapJsonToStoredContent(instance.getJSON()));
			},
		},
		[instanceKey],
	);

	useEffect(() => {
		if (!editor) {
			return;
		}
		editor.setEditable(!disabled);
	}, [editor, disabled]);

	useEffect(() => {
		if (!editor || !autoFocus || disabled) {
			return;
		}
		const frame = requestAnimationFrame(() => {
			editor.commands.focus("end");
		});
		return () => cancelAnimationFrame(frame);
	}, [editor, autoFocus, disabled, instanceKey]);

	useEffect(() => {
		if (!editor || editor.isDestroyed) {
			return;
		}

		const dom = editor.view?.dom;
		if (!dom) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (editor.isDestroyed) {
				return;
			}
			const mod = event.metaKey || event.ctrlKey;
			if (!mod) {
				return;
			}
			if (event.key === "u") {
				event.preventDefault();
				editor.chain().focus().toggleUnderline().run();
				return;
			}
			if (event.key === "k") {
				event.preventDefault();
				openLinkDialogRef.current();
				return;
			}
			if (event.shiftKey && event.key === "1") {
				event.preventDefault();
				editor.chain().focus().toggleHeading({ level: 1 }).run();
				return;
			}
			if (event.shiftKey && event.key.toLowerCase() === "b") {
				event.preventDefault();
				editor.chain().focus().toggleBlockquote().run();
			}
		};

		dom.addEventListener("keydown", onKeyDown);
		return () => {
			if (editor.isDestroyed) {
				return;
			}
			const cleanupDom = editor.view?.dom;
			if (cleanupDom) {
				cleanupDom.removeEventListener("keydown", onKeyDown);
			}
		};
	}, [editor]);

	useEffect(() => {
		// A new `instanceKey` destroys the previous editor; this effect can still
		// fire with that dead instance (its `commands` are gone) in the same pass
		// that the form clears `value`. The replacement editor starts from `value`.
		if (!editor || editor.isDestroyed) {
			return;
		}
		const current = tiptapJsonToStoredContent(editor.getJSON());
		const external = valueRef.current;
		if (current === external) {
			return;
		}
		if (
			contentPlainText(current).trim() === contentPlainText(external).trim()
		) {
			return;
		}
		suppressOnChangeRef.current = true;
		const nextDoc =
			contentPlainText(external).trim().length === 0
				? EMPTY_TIPTAP_DOC
				: storedContentToTiptapJson(external);
		editor.commands.setContent(nextDoc, { emitUpdate: false });
		suppressOnChangeRef.current = false;
		// Text put in from outside (a reply that starts with a mention): keep typing after it.
		if (editor.isFocused) {
			editor.commands.focus("end");
		}
	}, [editor, value]);

	if (!editor) {
		return null;
	}

	const plainLength = contentPlainText(value).length;

	const openLinkDialog = () => {
		setLinkDialogOpen(true);
	};

	const selectionLabel = () => {
		const { from, to, empty } = editor.state.selection;
		if (empty) {
			return "";
		}
		return editor.state.doc.textBetween(from, to, " ");
	};

	const applyLink = ({ href, label, display }: RichTextLinkDialogResult) => {
		const text = label.trim() || href;
		const internal = href.startsWith("/");
		const linkMark = {
			type: "link",
			attrs: {
				href,
				target: internal ? null : "_blank",
				rel: internal ? null : "noopener noreferrer",
			},
		};

		if (display === "card") {
			editor
				.chain()
				.focus()
				.insertContent({ type: "linkCard", attrs: { href, label: text } })
				.run();
			return;
		}

		// Editing the link the cursor is in: replace it, text and address.
		if (editor.isActive("link")) {
			editor
				.chain()
				.focus()
				.extendMarkRange("link")
				.insertContent({ type: "text", text, marks: [linkMark] })
				.run();
			return;
		}

		if (editor.state.selection.empty) {
			editor
				.chain()
				.focus()
				.insertContent({ type: "text", text, marks: [linkMark] })
				.run();
			return;
		}
		editor.chain().focus().setLink({ href }).run();
	};

	return (
		<>
			<div
				className={cn(
					"flex flex-col border border-border bg-background",
					disabled && "opacity-60",
					className,
				)}
			>
				<div className="flex flex-wrap items-center gap-0.5 border-border border-b bg-muted/20 p-1">
					<ToolbarButton
						label="Bold (⌘B)"
						active={editor.isActive("bold")}
						disabled={disabled}
						onClick={() => editor.chain().focus().toggleBold().run()}
					>
						<Bold className="size-4" aria-hidden />
					</ToolbarButton>
					<ToolbarButton
						label="Italic (⌘I)"
						active={editor.isActive("italic")}
						disabled={disabled}
						onClick={() => editor.chain().focus().toggleItalic().run()}
					>
						<Italic className="size-4" aria-hidden />
					</ToolbarButton>
					<ToolbarButton
						label="Underline (⌘U)"
						active={editor.isActive("underline")}
						disabled={disabled}
						onClick={() => editor.chain().focus().toggleUnderline().run()}
					>
						<UnderlineIcon className="size-4" aria-hidden />
					</ToolbarButton>
					<ToolbarButton
						label="Heading (⌘⇧1)"
						active={editor.isActive("heading", { level: 1 })}
						disabled={disabled}
						onClick={() =>
							editor.chain().focus().toggleHeading({ level: 1 }).run()
						}
					>
						<Heading1 className="size-4" aria-hidden />
					</ToolbarButton>
					<ToolbarButton
						label="Blockquote (⌘⇧B)"
						active={editor.isActive("blockquote")}
						disabled={disabled}
						onClick={() => editor.chain().focus().toggleBlockquote().run()}
					>
						<Quote className="size-4" aria-hidden />
					</ToolbarButton>
					<ToolbarButton
						label="Link (⌘K)"
						active={editor.isActive("link")}
						disabled={disabled}
						onClick={openLinkDialog}
					>
						<Link2 className="size-4" aria-hidden />
					</ToolbarButton>
				</div>
				<LinkContextBar editor={editor} onEdit={openLinkDialog} />
				<EditorContent editor={editor} />
				{enableMentions ? (
					<MentionPicker
						request={mentionRequest}
						keyHandlerRef={mentionKeyHandler}
						context={mentionContext}
					/>
				) : null}
				<p className="border-border border-t px-3 py-1.5 text-muted-foreground text-xs tabular-nums">
					{plainLength}/{maxPlainLength}
				</p>
			</div>

			<RichTextLinkDialog
				open={linkDialogOpen}
				onOpenChange={setLinkDialogOpen}
				initialHref={editor.getAttributes("link").href as string | undefined}
				initialLabel={selectionLabel() || undefined}
				hasSelection={!editor.state.selection.empty && !editor.isActive("link")}
				onApply={applyLink}
				onRemove={() =>
					editor.chain().focus().extendMarkRange("link").unsetLink().run()
				}
			/>
		</>
	);
}
