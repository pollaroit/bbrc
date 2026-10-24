"use client";

import type { InternalLinkRef } from "@bbrc/shared";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@bbrc/ui/components/hover-card";
import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import {
	ExternalLinkCard,
	LinkPreviewCard,
} from "@/components/blocks/link-preview-card";
import { internalRefOf, toSitePath } from "@/lib/link-preview/site-path";
import { cn } from "@/lib/utils";

/** Underlined, in the accent colour, like links in any article. */
export const richLinkClass =
	"font-medium text-primary underline decoration-primary/40 decoration-1 underline-offset-[3px] transition-colors hover:decoration-primary focus-visible:outline-2 focus-visible:outline-ring";

/** @name of a member: a quiet highlight instead of an underline. */
export const richMentionClass =
	"bg-primary/10 px-1 font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-ring";

type RichInlineLinkProps = {
	href: string;
	internal?: InternalLinkRef | null;
	/** `member` shows the @name highlight. */
	tone?: "link" | "member";
	className?: string;
	children: React.ReactNode;
};

/**
 * A link inside a sentence. On a computer, pointing at it shows a preview card
 * of what it leads to; outside links say so before you click.
 */
export function RichInlineLink({
	href,
	internal,
	tone = "link",
	className,
	children,
}: RichInlineLinkProps) {
	const [open, setOpen] = useState(false);
	const ref = internalRefOf(href, internal);
	const triggerClass = cn(
		tone === "member" ? richMentionClass : richLinkClass,
		className,
	);

	if (ref) {
		const path = toSitePath(href);
		return (
			<HoverCard open={open} onOpenChange={setOpen}>
				<HoverCardTrigger
					delay={350}
					closeDelay={120}
					render={
						<Link
							href={path as Route}
							className={triggerClass}
							onClick={(event) => event.stopPropagation()}
						/>
					}
				>
					{children}
				</HoverCardTrigger>
				<HoverCardContent>
					<LinkPreviewCard
						href={path}
						internal={ref}
						variant="hover"
						enabled={open}
					/>
				</HoverCardContent>
			</HoverCard>
		);
	}

	return (
		<HoverCard open={open} onOpenChange={setOpen}>
			<HoverCardTrigger
				delay={350}
				closeDelay={120}
				render={
					<a
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className={triggerClass}
						onClick={(event) => event.stopPropagation()}
					/>
				}
			>
				{children}
				<ExternalLink
					className="ms-0.5 inline size-[0.8em] -translate-y-px opacity-70"
					aria-hidden
				/>
				<span className="sr-only"> (opens another website)</span>
			</HoverCardTrigger>
			<HoverCardContent>
				<ExternalLinkCard href={href} variant="hover" asStatic />
			</HoverCardContent>
		</HoverCard>
	);
}
