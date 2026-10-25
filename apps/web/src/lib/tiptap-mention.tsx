"use client";

import { PluginKey } from "@tiptap/pm/state";
import {
	mergeAttributes,
	Node,
	type NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { richMentionClass } from "@/components/blocks/rich-inline-link";
import { cn } from "@/lib/utils";

/*
 * "@" mentions in the editor.
 *
 * - Typing "@" at the start of a line or after a space opens the picker (never
 *   inside a word, so `ann@example.com` is left alone).
 * - A mention is ONE atom node shown as "@Jon Doe": highlighted, a pointer on
 *   hover, removed whole by one Backspace or Delete, and clicking it opens the
 *   picker again to swap the person.
 * - The editor only reports what the picker should show (`onPicker`); the picker
 *   itself lives in React next to the editor and answers keys through `keyHandler`.
 */

export type MentionPick = {
	id: string;
	username: string;
	name: string;
};

export type MentionPickerRequest = {
	/** `insert`: the text after "@" is the query. `replace`: the picker has its own search box. */
	mode: "insert" | "replace";
	query: string;
	clientRect: () => DOMRect | null;
	onPick: (pick: MentionPick) => void;
	/** Only used by `replace`, whose popup closes itself. */
	onClose: () => void;
};

export type MentionExtensionOptions = {
	onPicker: (request: MentionPickerRequest | null) => void;
	/** The picker puts its key handler here; returns true when it used the key. */
	keyHandler: { current: ((event: KeyboardEvent) => boolean) | null };
};

function MentionNodeView({ node, extension, editor, getPos }: NodeViewProps) {
	const name = String(node.attrs.name || node.attrs.username || "");
	const options = extension.options as MentionExtensionOptions;

	function openPicker(element: HTMLElement) {
		if (!editor.isEditable) return;
		options.onPicker({
			mode: "replace",
			query: "",
			clientRect: () => element.getBoundingClientRect(),
			onPick: (pick) => {
				const pos = getPos();
				if (typeof pos !== "number") return;
				editor
					.chain()
					.focus()
					.command(({ tr }) => {
						tr.setNodeMarkup(pos, undefined, {
							userId: pick.id,
							username: pick.username,
							name: pick.name,
						});
						return true;
					})
					.run();
				options.onPicker(null);
			},
			onClose: () => options.onPicker(null),
		});
	}

	return (
		<NodeViewWrapper
			as="span"
			contentEditable={false}
			data-mention=""
			className={cn(
				richMentionClass,
				"inline-block cursor-pointer align-baseline",
			)}
			role="button"
			tabIndex={-1}
			title="Click to change who is mentioned"
			onClick={(event: React.MouseEvent<HTMLElement>) =>
				openPicker(event.currentTarget)
			}
		>
			@{name}
		</NodeViewWrapper>
	);
}

export const Mention = Node.create<MentionExtensionOptions>({
	name: "mention",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,
	draggable: false,

	addOptions() {
		return {
			onPicker: () => {},
			keyHandler: { current: null },
		};
	},

	addAttributes() {
		return {
			userId: { default: null },
			username: { default: "" },
			name: { default: "" },
		};
	},

	parseHTML() {
		return [
			{
				tag: "span[data-mention]",
				getAttrs: (element) => {
					const dom = element as HTMLElement;
					return {
						userId: dom.getAttribute("data-user-id") || null,
						username: dom.getAttribute("data-username") || "",
						name: dom.getAttribute("data-name") || "",
					};
				},
			},
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		const name = String(node.attrs.name || node.attrs.username || "");
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-mention": "",
				"data-user-id": node.attrs.userId ?? "",
				"data-username": node.attrs.username,
				"data-name": node.attrs.name,
			}),
			`@${name}`,
		];
	},

	renderText({ node }) {
		return `@${node.attrs.name || node.attrs.username}`;
	},

	addNodeView() {
		return ReactNodeViewRenderer(MentionNodeView, { as: "span" });
	},

	addKeyboardShortcuts() {
		// One press removes the whole mention, in either direction.
		const removeNeighbour = (direction: "before" | "after") => () =>
			this.editor.commands.command(({ tr, state }) => {
				const { selection } = state;
				if (!selection.empty) return false;
				const { $from } = selection;
				const neighbour =
					direction === "before" ? $from.nodeBefore : $from.nodeAfter;
				if (neighbour?.type.name !== this.name) return false;
				const from =
					direction === "before" ? $from.pos - neighbour.nodeSize : $from.pos;
				tr.delete(from, from + neighbour.nodeSize);
				return true;
			});
		return {
			Backspace: removeNeighbour("before"),
			Delete: removeNeighbour("after"),
		};
	},

	addProseMirrorPlugins() {
		const options = this.options;
		return [
			Suggestion<MentionPick, MentionPick>({
				editor: this.editor,
				pluginKey: new PluginKey("mention-suggestion"),
				char: "@",
				// A name cannot start with a space, and "@Jon Doe" is searched by "@Jon".
				allowSpaces: false,
				allowedPrefixes: [" ", "\n"],
				command: ({ editor, range, props }) => {
					const after = editor.state.doc.textBetween(
						range.to,
						Math.min(range.to + 1, editor.state.doc.content.size),
					);
					editor
						.chain()
						.focus()
						.insertContentAt(range, [
							{
								type: this.name,
								attrs: {
									userId: props.id,
									username: props.username,
									name: props.name,
								},
							},
							...(after === " " ? [] : [{ type: "text", text: " " }]),
						])
						.run();
				},
				render: () => {
					const show = (props: {
						query: string;
						clientRect?: (() => DOMRect | null) | null;
						command: (pick: MentionPick) => void;
					}) =>
						options.onPicker({
							mode: "insert",
							query: props.query,
							clientRect: props.clientRect ?? (() => null),
							onPick: props.command,
							onClose: () => {},
						});
					return {
						onStart: show,
						onUpdate: show,
						onExit: () => options.onPicker(null),
						onKeyDown: ({ event }) =>
							options.keyHandler.current?.(event) ?? false,
					};
				},
			}),
		];
	},
});
