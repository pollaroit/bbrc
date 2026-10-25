"use client";

import {
	parseStoredContent,
	type RichInline,
	type TextMark,
} from "@bbrc/shared";
import { Fragment } from "react";
import { LinkPreviewCard } from "@/components/blocks/link-preview-card";
import { MentionInline } from "@/components/blocks/mention/mention-inline";
import { RichInlineLink } from "@/components/blocks/rich-inline-link";
import { cn } from "@/lib/utils";

type RichContentViewProps = {
	content: string;
	className?: string;
	/** Elevate links for click targets inside stretched card links (feed). */
	interactiveLinks?: boolean;
	/** Smaller link cards, for comments and other tight spaces. */
	compact?: boolean;
};

const richLinkInteractiveClass = "pointer-events-auto relative z-[2]";

function applyMarks(text: string, marks: Set<TextMark>): React.ReactNode {
	let element: React.ReactNode = text;
	if (marks.has("bold")) {
		element = <strong>{element}</strong>;
	}
	if (marks.has("italic")) {
		element = <em>{element}</em>;
	}
	if (marks.has("underline")) {
		element = <span className="underline">{element}</span>;
	}
	return element;
}

function renderTextWithLineBreaks(
	text: string,
	marks: Set<TextMark>,
	keyPrefix: string,
) {
	const lines = text.split("\n");
	return lines.map((line, index) => (
		<Fragment key={`${keyPrefix}-line-${index}`}>
			{index > 0 ? <br /> : null}
			{applyMarks(line, marks)}
		</Fragment>
	));
}

function renderInline(
	inline: RichInline[],
	keyPrefix: string,
	interactiveLinks: boolean,
) {
	return inline.map((node, index) => {
		const key = `${keyPrefix}-${index}`;
		const interactiveClass = interactiveLinks
			? richLinkInteractiveClass
			: undefined;

		switch (node.t) {
			case "text": {
				const marks = new Set(node.m ?? []);
				return (
					<span key={key}>{renderTextWithLineBreaks(node.s, marks, key)}</span>
				);
			}
			case "mention":
				return (
					<MentionInline key={key} node={node} className={interactiveClass} />
				);
			case "link":
				return (
					<RichInlineLink
						key={key}
						href={node.href}
						internal={node.internal}
						className={interactiveClass}
					>
						{node.label}
					</RichInlineLink>
				);
			default: {
				const _exhaustive: never = node;
				return _exhaustive;
			}
		}
	});
}

export function RichContentView({
	content,
	className,
	interactiveLinks = false,
	compact = false,
}: RichContentViewProps) {
	const doc = parseStoredContent(content);

	return (
		<div
			className={cn(
				"rich-content-view space-y-2 font-reading text-sm leading-relaxed",
				className,
			)}
		>
			{doc.blocks.map((block, blockIndex) => {
				if (block.t === "embed") {
					return (
						<LinkPreviewCard
							key={`block-${blockIndex}`}
							href={block.href}
							internal={block.internal}
							label={block.label}
							variant={compact ? "compact" : "card"}
							className={cn(
								"my-1 w-full max-w-xl",
								interactiveLinks && richLinkInteractiveClass,
							)}
						/>
					);
				}

				const inline = renderInline(
					block.inline,
					`b${blockIndex}`,
					interactiveLinks,
				);

				switch (block.t) {
					case "h":
						return (
							<p
								key={`block-${blockIndex}`}
								className="font-semibold text-lg tracking-tight"
							>
								{inline}
							</p>
						);
					case "blockquote":
						return (
							<blockquote
								key={`block-${blockIndex}`}
								className="border-border border-l-2 pl-3 text-muted-foreground"
							>
								{inline}
							</blockquote>
						);
					case "p":
						return <p key={`block-${blockIndex}`}>{inline}</p>;
					default: {
						const _exhaustive: never = block;
						return _exhaustive;
					}
				}
			})}
		</div>
	);
}
