import type { RichDocument, RichInline } from "./types";

function inlinePlainText(inline: RichInline[]): string {
	let out = "";
	for (const node of inline) {
		switch (node.t) {
			case "text":
				out += node.s;
				break;
			case "link":
				out += node.label;
				break;
			case "mention":
				out += `@${node.username}`;
				break;
			default: {
				const _exhaustive: never = node;
				void _exhaustive;
			}
		}
	}
	return out;
}

export function richDocumentPlainText(doc: RichDocument): string {
	return doc.blocks
		.map((block) =>
			block.t === "embed" ? block.label : inlinePlainText(block.inline),
		)
		.filter((line) => line.length > 0)
		.join("\n");
}

export function plainTextToRichDocument(text: string): RichDocument {
	const trimmed = text.trim();
	if (!trimmed) {
		return { v: 1, blocks: [{ t: "p", inline: [{ t: "text", s: "" }] }] };
	}

	const paragraphs = trimmed.split(/\n{2,}/);
	const blocks = paragraphs.map((paragraph) => ({
		t: "p" as const,
		inline: [{ t: "text" as const, s: paragraph.replace(/\n/g, " ") }],
	}));

	return { v: 1, blocks };
}
