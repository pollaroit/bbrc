import { internalLinkRefFromHref } from "./internal-link";
import type { RichBlock, RichDocument, RichInline } from "./types";

function sanitizeInline(inline: RichInline[]): RichInline[] {
	return inline.map((node) => {
		switch (node.t) {
			case "text":
				return {
					t: "text",
					s: node.s,
					m: node.m?.length ? [...new Set(node.m)] : undefined,
				};
			case "link": {
				const href = node.href.trim();
				const label = node.label.trim() || href;
				const internal =
					node.internal ?? internalLinkRefFromHref(href) ?? undefined;
				if (!internal && !/^https:\/\//i.test(href)) {
					return { t: "text", s: label };
				}
				return { t: "link", href, label, internal };
			}
			case "mention":
				return { t: "mention", username: node.username.toLowerCase() };
			default: {
				const _exhaustive: never = node;
				return _exhaustive;
			}
		}
	});
}

function sanitizeBlock(block: RichBlock): RichBlock {
	return {
		t: block.t,
		inline: sanitizeInline(block.inline),
	} as RichBlock;
}

export function validateRichDocument(doc: RichDocument): RichDocument {
	if (doc.v !== 1 || !Array.isArray(doc.blocks)) {
		throw new Error("Invalid rich document");
	}
	return {
		v: 1,
		blocks: doc.blocks.map(sanitizeBlock),
	};
}

export function enrichDocumentLinks(doc: RichDocument): RichDocument {
	return validateRichDocument(doc);
}
