"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MemberProfileNavProps = {
	username: string;
	isOwnProfile?: boolean;
};

type ProfileSegment =
	| "overview"
	| "sittings"
	| "reads"
	| "posts"
	| "feedbacks"
	| "shelves"
	| "goals"
	| "reels";

const tabs: { segment: ProfileSegment; label: string; ownOnly?: boolean }[] = [
	{ segment: "overview", label: "Overview" },
	{ segment: "sittings", label: "Sittings" },
	{ segment: "reads", label: "Reads" },
	{ segment: "posts", label: "Feed" },
	{ segment: "feedbacks", label: "Feedbacks" },
	{ segment: "shelves", label: "Shelves" },
	{ segment: "goals", label: "Goals" },
	{ segment: "reels", label: "Reels", ownOnly: true },
];

function tabHref(username: string, segment: ProfileSegment) {
	return (
		segment === "overview"
			? `/users/${username}`
			: `/users/${username}/${segment}`
	) as Route;
}

function activeSegment(pathname: string, username: string): ProfileSegment {
	const base = `/users/${username}`;
	for (const { segment } of tabs) {
		if (segment !== "overview" && pathname.startsWith(`${base}/${segment}`)) {
			return segment;
		}
	}
	return "overview";
}

const FADE = "1.75rem";

export function MemberProfileNav({
	username,
	isOwnProfile = false,
}: MemberProfileNavProps) {
	const pathname = usePathname();
	const current = activeSegment(pathname, username);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const [fade, setFade] = useState({ left: false, right: false });

	const updateFade = useCallback(() => {
		const el = scrollerRef.current;
		if (!el) return;
		setFade({
			left: el.scrollLeft > 1,
			right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
		});
	}, []);

	useEffect(() => {
		updateFade();
		window.addEventListener("resize", updateFade);
		return () => window.removeEventListener("resize", updateFade);
	}, [updateFade]);

	// Keep the active tab centered when the row overflows (mobile).
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-run on route change
	useEffect(() => {
		const scroller = scrollerRef.current;
		const active = scroller?.querySelector<HTMLElement>("[aria-current=page]");
		if (!scroller || !active) return;
		scroller.scrollTo({
			left: active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2,
			behavior: "smooth",
		});
	}, [current]);

	const mask = `linear-gradient(to right, ${fade.left ? "transparent" : "#000"} 0, #000 ${FADE}, #000 calc(100% - ${FADE}), ${fade.right ? "transparent" : "#000"} 100%)`;

	return (
		<nav
			aria-label="Member profile sections"
			className="sticky top-[calc(3.5rem+max(0.25rem,env(safe-area-inset-top)))] z-20 -mx-6 border-border border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80 md:top-14 md:mx-0 md:border"
		>
			<div
				ref={scrollerRef}
				onScroll={updateFade}
				style={{ maskImage: mask, WebkitMaskImage: mask }}
				className="flex overflow-x-auto px-3 [scrollbar-width:none] md:px-1 [&::-webkit-scrollbar]:hidden"
			>
				{tabs
					.filter((tab) => !tab.ownOnly || isOwnProfile)
					.map((tab) => {
						const active = tab.segment === current;
						return (
							<Link
								key={tab.segment}
								href={tabHref(username, tab.segment)}
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
