"use client";

import type { ActivityOverviewOutput } from "@bbrc/api/modules/reading-activity/reading-activity.schema";
import { daysInclusive, formatActivityDuration } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Card, CardContent } from "@bbrc/ui/components/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Bar, BarChart, XAxis } from "recharts";
import { formatWeekLabel, plural } from "./format";
import { weeklySeconds } from "./weekly";

type Full = Extract<ActivityOverviewOutput, { access: "full" }>;

const weekConfig = {
	minutes: { label: "Minutes read", color: "var(--chart-1)" },
};

/**
 * The top of the page: how long this has all come to, what it covers, how it
 * compares with before, and the shape of the last six months week by week.
 */
export function ActivityHero({
	overview,
	subject,
}: {
	overview: Full;
	/** "You" for the member, their name for everyone else. */
	subject: string;
}) {
	const { summary, comparison } = overview;
	const weeks = weeklySeconds(overview.calendar, overview.today, 26).map(
		(point) => ({
			label: formatWeekLabel(point.week),
			minutes: Math.round(point.seconds / 60),
		}),
	);
	const diff = comparison
		? comparison.current.seconds - comparison.previous.seconds
		: null;
	const comparisonDays = comparison
		? daysInclusive(comparison.range.from, comparison.range.to)
		: 0;
	const TrendIcon =
		diff == null || diff === 0
			? Minus
			: diff > 0
				? ArrowUpRight
				: ArrowDownRight;

	return (
		<Card className="overflow-hidden">
			<CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
				<div className="flex flex-col gap-3">
					<p className="font-medium text-muted-foreground text-sm">
						Time {subject === "You" ? "you have" : `${subject} has`} spent
						reading
					</p>
					<p className="font-heading font-semibold text-5xl tabular-nums leading-none tracking-tight sm:text-6xl">
						{formatActivityDuration(summary.seconds)}
					</p>
					<p className="text-muted-foreground text-sm leading-relaxed">
						{summary.sessions === 0
							? "No sessions match these filters."
							: `${plural(summary.sessions, "session")} on ${plural(summary.activeDays, "day")}, across ${plural(summary.books, "book")}.`}
					</p>
					{diff != null && comparison ? (
						<Badge variant="outline" className="w-fit gap-1 tabular-nums">
							<TrendIcon className="size-3" aria-hidden />
							{diff === 0
								? `Same as the ${comparisonDays} days before`
								: `${formatActivityDuration(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than the ${comparisonDays} days before`}
						</Badge>
					) : null}
				</div>
				<div className="flex flex-col gap-1">
					<ChartContainer config={weekConfig} className="h-24 w-full">
						<BarChart data={weeks} margin={{ left: 0, right: 0, top: 4 }}>
							<XAxis dataKey="label" hide />
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent hideLabel={false} />}
							/>
							<Bar dataKey="minutes" fill="var(--color-minutes)" />
						</BarChart>
					</ChartContainer>
					<p className="text-muted-foreground text-xs">
						Minutes per week over the last six months
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
