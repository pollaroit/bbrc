"use client";

import { Button } from "@bbrc/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
	BOOK_DETAIL_TABS,
	type BookDetailTab,
	bookDetailTabFromPathname,
} from "@/lib/book-detail-tabs";
import { BOOK_TONES } from "@/lib/book-tones";
import { useBookLiveCounts } from "@/lib/books/use-book-live-counts";
import { cn } from "@/lib/utils";

export type BookTabCounts = {
	documents?: number;
	shelves?: number;
	reviews?: number;
	reads?: number;
	reading?: number;
	favorites?: number;
	sittings?: number;
};

type BookSubnavProps = {
	slug: string;
	/** What the server already knows (reviews, documents, shelves, sittings). */
	counts?: BookTabCounts;
};

function tabCount(
	tab: BookDetailTab,
	counts: BookTabCounts,
): number | undefined {
	switch (tab.id) {
		case "documents":
			return counts.documents;
		case "shelves":
			return counts.shelves;
		case "reviews":
			return counts.reviews;
		case "reads":
			return counts.reads;
		case "reading":
			return counts.reading;
		case "favorites":
			return counts.favorites;
		case "sittings":
			return counts.sittings;
		default:
			return undefined;
	}
}

/**
 * The book's sections as a slim sticky tab bar: an icon, the name and how much
 * is behind it. The open tab carries a line in its own colour; when the bar is
 * wider than the page it scrolls, with arrows at the edges.
 */
export function BookSubnav({ slug, counts }: BookSubnavProps) {
	const pathname = usePathname() ?? "";
	const active = bookDetailTabFromPathname(slug, pathname);
	const { data: session } = authClient.useSession();
	const live = useBookLiveCounts(slug);
	const tabs = BOOK_DETAIL_TABS.filter(
		(tab) => tab.id !== "insights" || session?.user != null,
	);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const [edges, setEdges] = useState({ left: false, right: false });

	const effective: BookTabCounts = {
		...counts,
		reads: live.reads ?? counts?.reads,
		reading: live.reading ?? counts?.reading,
		favorites: live.favorites ?? counts?.favorites,
	};

	const measure = useCallback(() => {
		const el = scrollerRef.current;
		if (!el) return;
		setEdges({
			left: el.scrollLeft > 4,
			right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
		});
	}, []);

	useEffect(() => {
		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, [measure]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: bring the open tab into view on route change
	useEffect(() => {
		const scroller = scrollerRef.current;
		const current = scroller?.querySelector<HTMLElement>("[aria-current=page]");
		if (!scroller || !current) return;
		const reduce = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		scroller.scrollTo({
			left:
				current.offsetLeft - scroller.clientWidth / 2 + current.clientWidth / 2,
			behavior: reduce ? "auto" : "smooth",
		});
	}, [active]);

	function nudge(direction: -1 | 1) {
		const el = scrollerRef.current;
		if (!el) return;
		const reduce = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		el.scrollBy({
			left: direction * el.clientWidth * 0.7,
			behavior: reduce ? "auto" : "smooth",
		});
	}

	return (
		<nav
			aria-label="Book sections"
			className="sticky top-[calc(3.5rem+max(0.25rem,env(safe-area-inset-top)))] z-20 -mx-6 bg-background/95 pt-2 backdrop-blur-md md:top-14 lg:mx-0"
		>
			<div className="relative">
				<span
					aria-hidden
					className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border"
				/>
				<div
					ref={scrollerRef}
					onScroll={measure}
					className="relative flex gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-6 [scrollbar-width:none] lg:px-0 [&::-webkit-scrollbar]:hidden"
				>
					{tabs.map((tab) => {
						const isActive = tab.id === active;
						const count = tabCount(tab, effective);
						const tone = BOOK_TONES[tab.tone];
						const Icon = tab.icon;

						return (
							<Link
								key={tab.id}
								href={tab.href(slug) as Route}
								aria-current={isActive ? "page" : undefined}
								className={cn(
									"flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 motion-reduce:transition-none",
									isActive
										? cn("font-medium text-foreground", tone.underline)
										: "border-transparent text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon
									className={cn("size-4 shrink-0", isActive && tone.ink)}
									aria-hidden
								/>
								{tab.label}
								{count != null && count > 0 ? (
									<span className="min-w-4 bg-muted px-1 text-center text-muted-foreground text-xs tabular-nums">
										{count}
									</span>
								) : null}
							</Link>
						);
					})}
				</div>
				{edges.left ? (
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						aria-label="Scroll sections left"
						onClick={() => nudge(-1)}
						className="absolute top-1/2 left-0 hidden -translate-y-1/2 bg-background lg:inline-flex"
					>
						<ChevronLeft aria-hidden />
					</Button>
				) : null}
				{edges.right ? (
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						aria-label="Scroll sections right"
						onClick={() => nudge(1)}
						className="absolute top-1/2 right-0 hidden -translate-y-1/2 bg-background lg:inline-flex"
					>
						<ChevronRight aria-hidden />
					</Button>
				) : null}
			</div>
		</nav>
	);
}
