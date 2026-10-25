import { internalLinkRefFromHref } from "./internal-link";
import type { RichBlock, RichDocument, RichInline } from "./types";

/** Preview cards per document; extra ones fall back to a plain link. */
export const RICH_EMBED_LIMIT = 3;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
				return {
					t: "mention",
					username: node.username.toLowerCase(),
					userId:
						node.userId && UUID.test(node.userId) ? node.userId : undefined,
					name: node.name?.trim().slice(0, 80) || undefined,
				};
			default: {
				const _exhaustive: never = node;
				return _exhaustive;
			}
		}
	});
}

function sanitizeBlock(block: RichBlock): RichBlock {
	if (block.t === "embed") {
		const href = block.href.trim();
		const label = block.label.trim() || href;
		const internal =
			block.internal ?? internalLinkRefFromHref(href) ?? undefined;
		if (!internal && !/^https:\/\//i.test(href)) {
			return { t: "p", inline: [{ t: "text", s: label }] };
		}
		return { t: "embed", href, label, internal };
	}
	return {
		t: block.t,
		inline: sanitizeInline(block.inline),
	} as RichBlock;
}

export function validateRichDocument(doc: RichDocument): RichDocument {
	if (doc.v !== 1 || !Array.isArray(doc.blocks)) {
		throw new Error("Invalid rich document");
	}
	let embeds = 0;
	return {
		v: 1,
		blocks: doc.blocks.map(sanitizeBlock).map((block): RichBlock => {
			if (block.t !== "embed") {
				return block;
			}
			embeds += 1;
			if (embeds <= RICH_EMBED_LIMIT) {
				return block;
			}
			// Too many cards: keep the link, drop the card.
			return {
				t: "p",
				inline: [
					{
						t: "link",
						href: block.href,
						label: block.label,
						internal: block.internal,
					},
				],
			};
		}),
	};
}

export function enrichDocumentLinks(doc: RichDocument): RichDocument {
	return validateRichDocument(doc);
}
