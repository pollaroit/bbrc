"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { ReadingCard } from "@/components/blocks/reading/reading-card";
import { authClient } from "@/lib/auth-client";
import { useMyReadings } from "@/lib/reading/use-reading";
import { cn } from "@/lib/utils";

/**
 * The books you are reading, above the sitting card on the home feed. The page
 * is cached for everyone, so this loads in the browser: the block opens with a
 * short slide instead of pushing the feed down in one jump, and renders nothing
 * when signed out or when you are not reading anything.
 */
export function HomeReadingCards({ className }: { className?: string }) {
	const { data: session } = authClient.useSession();
	const { data } = useMyReadings(Boolean(session?.user));
	const items = data?.items ?? [];
	const [expanded, setExpanded] = useState(false);
	const [shown, setShown] = useState(false);
	const hasItems = items.length > 0;

	// One frame after the first data, so the row opens instead of appearing.
	useEffect(() => {
		if (!hasItems) {
			setShown(false);
			return;
		}
		const frame = requestAnimationFrame(() => setShown(true));
		return () => cancelAnimationFrame(frame);
	}, [hasItems]);

	if (!session?.user || !hasItems) return null;

	const extra = items.length - 1;

	return (
		<section
			aria-label="Books you are reading"
			className={cn(
				"grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none",
				// The negative margin cancels the page gap while closed, so nothing jumps.
				shown
					? "mb-0 grid-rows-[1fr] opacity-100"
					: "-mb-8 grid-rows-[0fr] opacity-0",
				className,
			)}
		>
			<div className="min-h-0 overflow-hidden">
				<div className="flex flex-col gap-3">
					<h2 className="font-semibold text-base tracking-tight">
						Currently reading
					</h2>
					{items.map((reading, index) => (
						<ReadingCard
							key={reading.id}
							reading={reading}
							// On a phone only the first one shows until "more" is tapped.
							className={index > 0 && !expanded ? "max-md:hidden" : undefined}
						/>
					))}
					{extra > 0 ? (
						<button
							type="button"
							aria-expanded={expanded}
							onClick={() => setExpanded((value) => !value)}
							className="flex items-center justify-center gap-1.5 border border-border border-dashed py-2 text-muted-foreground text-sm transition-colors hover:text-foreground md:hidden"
						>
							{expanded
								? "Show less"
								: `${extra} more ${extra === 1 ? "book" : "books"}`}
							<ChevronDown
								className={cn(
									"size-4 transition-transform",
									expanded && "rotate-180",
								)}
								aria-hidden
							/>
						</button>
					) : null}
				</div>
			</div>
		</section>
	);
}
