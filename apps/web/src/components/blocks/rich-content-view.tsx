"use client";

import {
	hrefFromInternalLinkRef,
	parseStoredContent,
	type RichInline,
	type TextMark,
} from "@bbrc/shared";
import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

type RichContentViewProps = {
	content: string;
	className?: string;
	/** Elevate links for click targets inside stretched card links (feed). */
	interactiveLinks?: boolean;
};

/** Always visible — not tied to interactiveLinks (feed cards, comments, detail). */
const richLinkClass =
	"font-medium text-primary underline underline-offset-2 decoration-primary/50 hover:decoration-primary";

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
		const linkClass = cn(
			richLinkClass,
			interactiveLinks && richLinkInteractiveClass,
		);

		switch (node.t) {
			case "text": {
				const marks = new Set(node.m ?? []);
				return (
					<span key={key}>{renderTextWithLineBreaks(node.s, marks, key)}</span>
				);
			}
			case "mention":
				return (
					<Link
						key={key}
						href={`/users/${node.username}` as Route}
						className={linkClass}
						onClick={(event) => event.stopPropagation()}
					>
						@{node.username}
					</Link>
				);
			case "link": {
				const href = node.internal
					? hrefFromInternalLinkRef(node.internal)
					: node.href;
				const isExternal = !node.internal && /^https:\/\//i.test(href);
				if (node.internal) {
					return (
						<Link
							key={key}
							href={href as Route}
							className={linkClass}
							onClick={(event) => event.stopPropagation()}
						>
							{node.label}
						</Link>
					);
				}
				return (
					<a
						key={key}
						href={href}
						className={linkClass}
						onClick={(event) => event.stopPropagation()}
						{...(isExternal
							? { target: "_blank", rel: "noopener noreferrer" }
							: {})}
					>
						{node.label}
					</a>
				);
			}
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
}: RichContentViewProps) {
	const doc = parseStoredContent(content);

	return (
		<div
			className={cn(
				"rich-content-view space-y-2 text-sm leading-relaxed",
				className,
			)}
		>
			{doc.blocks.map((block, blockIndex) => {
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
