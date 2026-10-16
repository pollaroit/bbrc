import { internalLinkRefFromHref } from "./internal-link";
import type { RichBlock, RichDocument, RichInline, TextMark } from "./types";

const MENTION_PATTERN = /@([a-z0-9_]{3,30})/gi;
const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

type MarkWrapper = {
	open: string;
	close: string;
	mark: TextMark;
};

const MARK_WRAPPERS: MarkWrapper[] = [
	{ open: "**", close: "**", mark: "bold" },
	{ open: "__", close: "__", mark: "underline" },
	{ open: "*", close: "*", mark: "italic" },
];

function mergeMarks(
	existing: TextMark[] | undefined,
	mark: TextMark,
): TextMark[] {
	const set = new Set(existing ?? []);
	set.add(mark);
	return [...set];
}

function pushText(inline: RichInline[], text: string, marks?: TextMark[]) {
	if (!text) {
		return;
	}
	const last = inline.at(-1);
	if (last?.t === "text" && sameMarks(last.m, marks)) {
		last.s += text;
		return;
	}
	inline.push({ t: "text", s: text, m: marks?.length ? marks : undefined });
}

function sameMarks(a: TextMark[] | undefined, b: TextMark[] | undefined) {
	const aa = a ?? [];
	const bb = b ?? [];
	if (aa.length !== bb.length) {
		return false;
	}
	return aa.every((mark, index) => mark === bb[index]);
}

function parseInlineSegment(
	segment: string,
	marks: TextMark[] = [],
): RichInline[] {
	const inline: RichInline[] = [];
	let cursor = 0;

	while (cursor < segment.length) {
		let matched = false;

		for (const wrapper of MARK_WRAPPERS) {
			if (!segment.startsWith(wrapper.open, cursor)) {
				continue;
			}
			const end = segment.indexOf(wrapper.close, cursor + wrapper.open.length);
			if (end === -1) {
				continue;
			}
			const inner = segment.slice(cursor + wrapper.open.length, end);
			inline.push(
				...parseInlineSegment(inner, mergeMarks(marks, wrapper.mark)),
			);
			cursor = end + wrapper.close.length;
			matched = true;
			break;
		}
		if (matched) {
			continue;
		}

		const linkMatch = LINK_PATTERN.exec(segment.slice(cursor));
		if (linkMatch && linkMatch.index === 0) {
			const label = linkMatch[1]!.trim();
			const href = linkMatch[2]!.trim();
			const internal = internalLinkRefFromHref(href);
			inline.push({
				t: "link",
				label: label || href,
				href,
				internal: internal ?? undefined,
			});
			cursor += linkMatch[0].length;
			LINK_PATTERN.lastIndex = 0;
			continue;
		}
		LINK_PATTERN.lastIndex = 0;

		const mentionMatch = MENTION_PATTERN.exec(segment.slice(cursor));
		if (mentionMatch && mentionMatch.index === 0) {
			inline.push({ t: "mention", username: mentionMatch[1]! });
			cursor += mentionMatch[0].length;
			MENTION_PATTERN.lastIndex = 0;
			continue;
		}
		MENTION_PATTERN.lastIndex = 0;

		const nextSpecial = findNextSpecialIndex(segment, cursor);
		const chunk = segment.slice(cursor, nextSpecial);
		pushText(inline, chunk, marks);
		cursor = nextSpecial;
	}

	return inline;
}

function findNextSpecialIndex(segment: string, from: number): number {
	const indices = [
		segment.indexOf("**", from),
		segment.indexOf("__", from),
		segment.indexOf("*", from),
		segment.indexOf("[", from),
		segment.indexOf("@", from),
	].filter((index) => index !== -1);
	if (indices.length === 0) {
		return segment.length;
	}
	return Math.min(...indices);
}

function parseInlineLine(line: string): RichInline[] {
	const inline = parseInlineSegment(line);
	if (inline.length === 0) {
		return [{ t: "text", s: "" }];
	}
	return inline;
}

function parseBlock(rawLine: string): RichBlock {
	const line = rawLine.trimEnd();
	if (line.startsWith("# ")) {
		return { t: "h", inline: parseInlineLine(line.slice(2).trim()) };
	}
	if (line.startsWith("> ")) {
		return { t: "blockquote", inline: parseInlineLine(line.slice(2).trim()) };
	}
	if (line.startsWith(">")) {
		return { t: "blockquote", inline: parseInlineLine(line.slice(1).trim()) };
	}
	return { t: "p", inline: parseInlineLine(line) };
}

/** Club markdown subset for posts, comments, and reviews. */
export function parseMarkdownSubsetToRichDocument(text: string): RichDocument {
	const trimmed = text.trim();
	if (!trimmed) {
		return { v: 1, blocks: [{ t: "p", inline: [{ t: "text", s: "" }] }] };
	}

	const blocks = trimmed.split(/\n/).map((line) => parseBlock(line));
	return { v: 1, blocks };
}
