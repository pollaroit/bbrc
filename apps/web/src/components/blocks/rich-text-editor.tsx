"use client";

import { contentPlainText, RICH_CONTENT_MAX_PLAIN_CHARS } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	Bold,
	Heading1,
	Italic,
	Link2,
	Quote,
	Underline as UnderlineIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RichTextLinkDialog } from "@/components/blocks/rich-text-link-dialog";
import {
	EMPTY_TIPTAP_DOC,
	storedContentToTiptapJson,
	tiptapJsonToStoredContent,
} from "@/lib/rich-content-tiptap";
import { isAllowedRichLinkHref } from "@/lib/rich-link";
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
}: RichTextEditorProps) {
	const [linkDialogOpen, setLinkDialogOpen] = useState(false);
	const openLinkDialogRef = useRef<() => void>(() => {});
	openLinkDialogRef.current = () => setLinkDialogOpen(true);

	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

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
						class: "text-primary underline underline-offset-2",
					},
				}),
				Placeholder.configure({ placeholder }),
			],
			content: initialEditorDoc(value),
			editorProps: {
				attributes: {
					...(id ? { id } : {}),
					class: cn(
						"max-w-none px-3 py-2 text-sm leading-relaxed focus:outline-none",
						minHeightClassName,
						"[&_blockquote]:border-border [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h1]:font-semibold [&_h1]:text-lg",
						"[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
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

	const applyLink = (href: string, label: string) => {
		const { empty } = editor.state.selection;
		const text = label.trim() || href;
		if (empty) {
			editor
				.chain()
				.focus()
				.insertContent({
					type: "text",
					text,
					marks: [
						{
							type: "link",
							attrs: {
								href,
								target: href.startsWith("/") ? null : "_blank",
								rel: href.startsWith("/") ? null : "noopener noreferrer",
							},
						},
					],
				})
				.run();
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
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
				<EditorContent editor={editor} />
				<p className="border-border border-t px-3 py-1.5 text-muted-foreground text-xs tabular-nums">
					{plainLength}/{maxPlainLength}
				</p>
			</div>

			<RichTextLinkDialog
				open={linkDialogOpen}
				onOpenChange={setLinkDialogOpen}
				initialHref={editor.getAttributes("link").href as string | undefined}
				initialLabel={selectionLabel() || undefined}
				onApply={({ href, label }) => applyLink(href, label)}
				onRemove={() =>
					editor.chain().focus().extendMarkRange("link").unsetLink().run()
				}
			/>
		</>
	);
}
