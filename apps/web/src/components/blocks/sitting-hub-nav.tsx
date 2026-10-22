"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SittingHubNavProps = {
	sitting: GetSittingBySlugOutput;
};

type Segment = "overview" | "participants" | "vote";

function tabHref(slug: string, segment: Segment): Route {
	return (
		segment === "overview"
			? `/sittings/${slug}`
			: `/sittings/${slug}/${segment}`
	) as Route;
}

function activeSegment(pathname: string, slug: string): Segment {
	const base = `/sittings/${slug}`;
	if (pathname.startsWith(`${base}/vote`)) return "vote";
	if (pathname.startsWith(`${base}/participants`)) return "participants";
	return "overview";
}

export function SittingHubNav({ sitting }: SittingHubNavProps) {
	const pathname = usePathname();
	const current = activeSegment(pathname, sitting.slug);
	const hasPoll = sitting.poll != null;

	const tabs: { segment: Segment; label: string }[] = [
		{ segment: "overview", label: "Overview" },
		{ segment: "participants", label: "Participants" },
		...(hasPoll
			? [
					{
						segment: "vote" as const,
						label: sitting.status === "voting" ? "Voting" : "Voting results",
					},
				]
			: []),
	];

	return (
		<nav
			aria-label="Sitting sections"
			className="sticky top-[calc(3.5rem+max(0.25rem,env(safe-area-inset-top)))] z-20 -mx-6 border-border border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80 md:top-14 md:mx-0 md:border"
		>
			<div className="flex overflow-x-auto px-3 [scrollbar-width:none] md:px-1 [&::-webkit-scrollbar]:hidden">
				{tabs.map((tab) => {
					const active = tab.segment === current;
					return (
						<Link
							key={tab.segment}
							href={tabHref(sitting.slug, tab.segment)}
							aria-current={active ? "page" : undefined}
							className={cn(
								"relative flex h-11 shrink-0 items-center px-3 font-medium text-sm transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-foreground after:opacity-0 after:transition-opacity focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 md:h-10 md:flex-1 md:justify-center",
								active
									? "text-foreground after:opacity-100"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{tab.label}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
