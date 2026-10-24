"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Node,
	type NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from "@tiptap/react";
import { Link2, X } from "lucide-react";
import { LinkPreviewCard } from "@/components/blocks/link-preview-card";
import { cn } from "@/lib/utils";

function LinkCardView({
	node,
	selected,
	deleteNode,
	getPos,
	editor,
}: NodeViewProps) {
	const href = String(node.attrs.href ?? "");
	const label = String(node.attrs.label ?? "");

	function turnIntoLink() {
		const pos = getPos();
		if (typeof pos !== "number") return;
		editor
			.chain()
			.focus()
			.insertContentAt(
				{ from: pos, to: pos + node.nodeSize },
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: label || href,
							marks: [{ type: "link", attrs: { href } }],
						},
					],
				},
			)
			.run();
	}

	return (
		<NodeViewWrapper
			contentEditable={false}
			className={cn(
				"group/card relative my-2 max-w-xl",
				selected && "outline-2 outline-ring outline-offset-2",
			)}
			data-link-card=""
		>
			<LinkPreviewCard href={href} label={label} asStatic />
			<div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/card:opacity-100">
				<Button
					type="button"
					size="xs"
					variant="outline"
					className="bg-background"
					onClick={turnIntoLink}
				>
					<Link2 data-icon="inline-start" aria-hidden />
					Show as link
				</Button>
				<Button
					type="button"
					size="icon-xs"
					variant="outline"
					className="bg-background"
					aria-label="Remove card"
					onClick={() => deleteNode()}
				>
					<X className="size-3.5" aria-hidden />
				</Button>
			</div>
		</NodeViewWrapper>
	);
}

/** A link shown as a preview card on its own line. */
export const LinkCard = Node.create({
	name: "linkCard",
	group: "block",
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			href: { default: "" },
			label: { default: "" },
		};
	},

	parseHTML() {
		return [{ tag: "div[data-link-card]" }];
	},

	renderHTML({ node }) {
		return [
			"div",
			{
				"data-link-card": "",
				"data-href": String(node.attrs.href ?? ""),
			},
			String(node.attrs.label || node.attrs.href || ""),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(LinkCardView);
	},
});
