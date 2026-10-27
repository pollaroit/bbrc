"use client";

import type { LeaderboardPeriod } from "@bbrc/api/modules/leaderboard/leaderboard.schema";
import { Link, usePathname } from "@/i18n/navigation";
import {
	leaderboardPeriodOptionsForKind,
	leaderboardTabHref,
	parseLeaderboardPathname,
} from "@/lib/leaderboard/paths";
import { cn } from "@/lib/utils";

export function LeaderboardPeriodNav() {
	const pathname = usePathname() ?? "/leaderboard/overview";
	const { kind, period: activePeriod } = parseLeaderboardPathname(pathname);
	const periodOptions = leaderboardPeriodOptionsForKind(kind);

	return (
		<fieldset className="flex flex-col gap-2 border border-border bg-muted/15 p-2 sm:flex-row sm:items-center sm:justify-between">
			<legend className="sr-only">Ranking period</legend>
			<p className="px-1 text-muted-foreground text-xs sm:max-w-[14rem] sm:leading-snug">
				{kind === "reads"
					? "Reads rank by finish month. Month and year use club time."
					: "Weeks start Monday. Month and year follow the club timezone."}
			</p>
			<div className="flex flex-wrap gap-1">
				{periodOptions.map((option) => {
					const isActive = option.period === activePeriod;
					const href = leaderboardTabHref(
						kind,
						option.period as LeaderboardPeriod,
					);

					return (
						<Link
							key={option.period}
							href={href}
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"border px-3 py-1.5 text-sm transition-colors",
								isActive
									? "border-foreground bg-foreground text-background"
									: "border-border bg-background text-foreground hover:bg-muted/40",
							)}
						>
							{option.label}
						</Link>
					);
				})}
			</div>
		</fieldset>
	);
}
