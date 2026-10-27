"use client";

import { Link, usePathname } from "@/i18n/navigation";
import {
	activeLeaderboardTabId,
	LEADERBOARD_TABS,
	leaderboardTabHref,
	parseLeaderboardPathname,
} from "@/lib/leaderboard/paths";
import { cn } from "@/lib/utils";

export function LeaderboardSubnav() {
	const pathname = usePathname() ?? "";
	const active = activeLeaderboardTabId(pathname);
	const { period } = parseLeaderboardPathname(pathname);

	return (
		<nav
			className="sticky top-0 z-10 -mx-1 flex gap-0 overflow-x-auto border-border border-b bg-background/95 pb-0 backdrop-blur-sm [scrollbar-width:none] supports-[backdrop-filter]:bg-background/80 [&::-webkit-scrollbar]:hidden"
			aria-label="Leaderboard boards"
		>
			{LEADERBOARD_TABS.map((tab) => {
				const isActive = tab.id === active;

				return (
					<Link
						key={tab.id}
						href={leaderboardTabHref(
							tab.id === "hub" ? null : tab.segment,
							period,
						)}
						className={cn(
							"-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors",
							isActive
								? "border-foreground font-medium text-foreground"
								: "border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
						)}
					>
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}
