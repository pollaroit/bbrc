import type { RichBlock, RichDocument, RichInline } from "./types";

/** One piece of content can mention at most this many different members. */
export const MAX_MENTIONS_PER_CONTENT = 10;

export type MentionNode = Extract<RichInline, { t: "mention" }>;

/** What a mention reads as: the saved name, else the username. */
export const mentionLabel = (node: MentionNode) =>
	node.name?.trim() || node.username;

const inlinesOf = (block: RichBlock): RichInline[] =>
	block.t === "embed" ? [] : block.inline;

/** Every mention in a document, once per member (by id when known, else by username). */
export function extractMentions(doc: RichDocument): MentionNode[] {
	const seen = new Set<string>();
	const found: MentionNode[] = [];
	for (const block of doc.blocks) {
		for (const node of inlinesOf(block)) {
			if (node.t !== "mention") continue;
			const key = node.userId ?? `u:${node.username}`;
			if (seen.has(key)) continue;
			seen.add(key);
			found.push(node);
		}
	}
	return found;
}

/**
 * Turns the mentions that fail `keep` into plain text ("@Jon Doe"), so a mention
 * of someone who may not be mentioned, or who asked to be removed, stays readable.
 */
export function replaceMentionsWithText(
	doc: RichDocument,
	keep: (node: MentionNode) => boolean,
): RichDocument {
	return {
		...doc,
		blocks: doc.blocks.map((block): RichBlock => {
			if (block.t === "embed") return block;
			return {
				...block,
				inline: block.inline.map(
					(node): RichInline =>
						node.t === "mention" && !keep(node)
							? { t: "text", s: `@${mentionLabel(node)}` }
							: node,
				),
			} as RichBlock;
		}),
	};
}
