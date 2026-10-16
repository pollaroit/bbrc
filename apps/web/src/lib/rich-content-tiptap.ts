import {
	internalLinkRefFromHref,
	parseStoredContent,
	type RichBlock,
	type RichDocument,
	type RichInline,
	serializeRichDocument,
	type TextMark,
} from "@bbrc/shared";
import type { JSONContent } from "@tiptap/react";

function marksFromTiptap(marks: JSONContent["marks"]): TextMark[] | undefined {
	if (!marks?.length) {
		return undefined;
	}
	const out: TextMark[] = [];
	for (const mark of marks) {
		if (mark.type === "bold") {
			out.push("bold");
		}
		if (mark.type === "italic") {
			out.push("italic");
		}
		if (mark.type === "underline") {
			out.push("underline");
		}
	}
	return out.length ? out : undefined;
}

function inlineFromTiptap(nodes: JSONContent[] | undefined): RichInline[] {
	if (!nodes?.length) {
		return [{ t: "text", s: "" }];
	}

	const inline: RichInline[] = [];

	for (const node of nodes) {
		if (node.type === "text") {
			const text = node.text ?? "";
			const linkMark = node.marks?.find((mark) => mark.type === "link");
			if (linkMark?.attrs?.href) {
				const href = String(linkMark.attrs.href);
				inline.push({
					t: "link",
					href,
					label: text || href,
					internal: internalLinkRefFromHref(href) ?? undefined,
				});
				continue;
			}
			inline.push({ t: "text", s: text, m: marksFromTiptap(node.marks) });
			continue;
		}
		if (node.type === "hardBreak") {
			inline.push({ t: "text", s: "\n" });
		}
	}

	return inline.length ? inline : [{ t: "text", s: "" }];
}

export function tiptapJsonToRichDocument(json: JSONContent): RichDocument {
	const blocks: RichBlock[] = [];

	for (const node of json.content ?? []) {
		if (node.type === "paragraph") {
			blocks.push({ t: "p", inline: inlineFromTiptap(node.content) });
			continue;
		}
		if (node.type === "heading") {
			blocks.push({ t: "h", inline: inlineFromTiptap(node.content) });
			continue;
		}
		if (node.type === "blockquote") {
			const paragraph = node.content?.find(
				(child) => child.type === "paragraph",
			);
			blocks.push({
				t: "blockquote",
				inline: inlineFromTiptap(paragraph?.content),
			});
		}
	}

	if (blocks.length === 0) {
		blocks.push({ t: "p", inline: [{ t: "text", s: "" }] });
	}

	return { v: 1, blocks };
}

function tiptapMarksFromInline(node: RichInline): JSONContent["marks"] {
	if (node.t === "link") {
		return [{ type: "link", attrs: { href: node.href, target: "_blank" } }];
	}
	if (node.t === "mention") {
		return undefined;
	}
	const marks: JSONContent["marks"] = [];
	for (const mark of node.m ?? []) {
		if (mark === "bold") {
			marks.push({ type: "bold" });
		}
		if (mark === "italic") {
			marks.push({ type: "italic" });
		}
		if (mark === "underline") {
			marks.push({ type: "underline" });
		}
	}
	return marks.length ? marks : undefined;
}

function tiptapInlineFromRich(inline: RichInline[]): JSONContent[] | undefined {
	const nodes: JSONContent[] = [];
	for (const node of inline) {
		if (node.t === "mention") {
			nodes.push({ type: "text", text: `@${node.username}` });
			continue;
		}
		if (node.t === "link") {
			const label = node.label.trim() || node.href;
			if (!label) {
				continue;
			}
			nodes.push({
				type: "text",
				text: label,
				marks: tiptapMarksFromInline(node),
			});
			continue;
		}
		if (!node.s) {
			continue;
		}
		nodes.push({
			type: "text",
			text: node.s,
			marks: tiptapMarksFromInline(node),
		});
	}
	return nodes.length ? nodes : undefined;
}

function blockNode(
	type: "paragraph" | "heading",
	inline: JSONContent[] | undefined,
	level?: number,
): JSONContent {
	if (type === "heading") {
		return inline?.length
			? { type: "heading", attrs: { level: level ?? 1 }, content: inline }
			: { type: "heading", attrs: { level: level ?? 1 } };
	}
	return inline?.length
		? { type: "paragraph", content: inline }
		: { type: "paragraph" };
}

export function richDocumentToTiptapContent(doc: RichDocument): JSONContent {
	return {
		type: "doc",
		content: doc.blocks.map((block) => {
			const inline = tiptapInlineFromRich(block.inline);
			if (block.t === "h") {
				return blockNode("heading", inline, 1);
			}
			if (block.t === "blockquote") {
				return {
					type: "blockquote",
					content: [blockNode("paragraph", inline)],
				};
			}
			return blockNode("paragraph", inline);
		}),
	};
}

export const EMPTY_TIPTAP_DOC: JSONContent = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

export function storedContentToTiptapJson(stored: string): JSONContent {
	return richDocumentToTiptapContent(parseStoredContent(stored));
}

export function tiptapJsonToStoredContent(json: JSONContent): string {
	return serializeRichDocument(tiptapJsonToRichDocument(json));
}
