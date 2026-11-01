"use client";

import type { ActivityOverviewOutput } from "@bbrc/api/modules/reading-activity/reading-activity.schema";
import {
	ACTIVITY_MODE_LABELS,
	daysInclusive,
	formatActivityDuration,
} from "@bbrc/shared";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import {
	BookOpen,
	CalendarCheck,
	Clock,
	Files,
	Flame,
	Library,
	Rows3,
	Timer,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	XAxis,
	YAxis,
} from "recharts";
import { ActivityBests } from "./activity-bests";
import { ActivityHeatmap } from "./activity-heatmap";
import { ActivityRankings } from "./activity-rankings";
import {
	formatDayLabel,
	formatMonthLabel,
	formatWeekLabel,
	plural,
} from "./format";
import { Cover, MODE_ICONS } from "./session-card";
import { StatCard, type Trend } from "./stat-card";
import type { ActivityStateApi } from "./use-activity-state";
import { weeklySeconds } from "./weekly";

type Full = Extract<ActivityOverviewOutput, { access: "full" }>;

function Section({
	title,
	hint,
	children,
}: {
	title: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<section className="flex min-w-0 flex-col gap-3">
			<div className="flex flex-col gap-0.5">
				<h2 className="font-heading font-semibold text-lg tracking-tight">
					{title}
				</h2>
				{hint ? <p className="text-muted-foreground text-sm">{hint}</p> : null}
			</div>
			{children}
		</section>
	);
}

const sparkConfig = { minutes: { label: "Minutes", color: "var(--chart-1)" } };
const speedConfig = {
	speed: { label: "Pages per hour", color: "var(--chart-1)" },
};
const finishedConfig = {
	count: { label: "Books finished", color: "var(--chart-2)" },
};

function shortMonth(key: string): string {
	return formatMonthLabel(key).replace(/^(\w{3})\w*\s\d{2}(\d{2})$/, "$1 $2");
}

function Meter({ share, label }: { share: number; label: string }) {
	return (
		<div
			role="img"
			aria-label={label}
			className="h-1.5 w-full overflow-hidden bg-muted"
		>
			<div
				className="h-full bg-primary"
				style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }}
			/>
		</div>
	);
}

/**
 * The Stats view: headline cards, an interactive heatmap, the member's
 * records, how they read, and rankings. Finished-book numbers come from the
 * readings themselves and say so when a filter stops them from applying.
 */
export function ActivityStats({
	overview,
	api,
}: {
	overview: Full;
	api: ActivityStateApi;
}) {
	const { summary, comparison, bests, scope, streak } = overview;
	const { state, setState } = api;
	const totalModeSeconds = overview.modes.reduce(
		(sum, m) => sum + m.seconds,
		0,
	);

	if (summary.sessions === 0) {
		return (
			<div className="border border-border border-dashed p-10 text-center">
				<p className="font-heading font-medium">
					Nothing to show for these filters
				</p>
				<p className="mt-1 text-muted-foreground text-sm">
					Widen the dates or remove a filter to see the numbers.
				</p>
			</div>
		);
	}

	const weeks = weeklySeconds(overview.calendar, overview.today, 12).map(
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
	const timeTrend: Trend | null =
		diff == null
			? null
			: {
					direction: diff === 0 ? "flat" : diff > 0 ? "up" : "down",
					text:
						diff === 0
							? "No change"
							: `${diff > 0 ? "+" : "-"}${formatActivityDuration(Math.abs(diff))}`,
				};
	const selected =
		state.from && state.to ? { from: state.from, to: state.to } : null;

	return (
		<div className="flex flex-col gap-10">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					featured
					icon={Clock}
					label="Time read"
					value={formatActivityDuration(summary.seconds)}
					trend={timeTrend}
					hint={
						comparison
							? `Compared with the ${comparisonDays} days before this range.`
							: "Over everything the filters leave."
					}
					className="sm:col-span-2"
				>
					<ChartContainer config={sparkConfig} className="h-14 w-full">
						<AreaChart data={weeks} margin={{ left: 0, right: 0, top: 4 }}>
							<XAxis dataKey="label" hide />
							<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
							<Area
								type="monotone"
								dataKey="minutes"
								stroke="var(--color-minutes)"
								fill="var(--color-minutes)"
								fillOpacity={0.2}
							/>
						</AreaChart>
					</ChartContainer>
				</StatCard>
				<StatCard
					icon={CalendarCheck}
					label="Days with reading"
					value={String(summary.activeDays)}
					hint={`Out of ${plural(overview.rangeDays, "day")} in this range.`}
				>
					<Meter
						share={
							overview.rangeDays ? summary.activeDays / overview.rangeDays : 0
						}
						label={`${summary.activeDays} of ${overview.rangeDays} days`}
					/>
				</StatCard>
				<StatCard
					icon={Rows3}
					label="Sessions"
					value={String(summary.sessions)}
					hint={
						summary.activeDays
							? `${(summary.sessions / summary.activeDays).toFixed(1)} on each reading day.`
							: undefined
					}
				/>
				<StatCard
					icon={Timer}
					label="Average session"
					value={formatActivityDuration(summary.averageSeconds)}
					hint={`The longest ran ${formatActivityDuration(summary.longestSeconds)}.`}
				/>
				<StatCard
					icon={Flame}
					label="Current streak"
					value={plural(streak.current, "day")}
					hint={
						bests.longestStreak
							? `The longest was ${plural(bests.longestStreak.days, "day")}.`
							: undefined
					}
				/>
				{summary.pagesGained != null ? (
					<StatCard
						icon={Files}
						label="Pages gained"
						value={summary.pagesGained.toLocaleString("en-US")}
						hint={
							overview.usualSpeed
								? `About ${Math.round(overview.usualSpeed)} pages per hour.`
								: undefined
						}
					/>
				) : null}
				<StatCard
					icon={Library}
					label="Different books"
					value={String(summary.books)}
					hint={
						bests.topBook
							? `Most time went to ${bests.topBook.title}.`
							: undefined
					}
				/>
			</div>

			<ActivityHeatmap
				days={overview.calendar}
				today={overview.today}
				metric={state.heat}
				onMetric={(heat) => void setState({ heat })}
				selected={selected}
				onPick={(day) =>
					selected?.from === day && selected.to === day
						? void setState({ from: null, to: null })
						: void setState({ from: day, to: day, range: "all" })
				}
			/>

			<Section title="Records" hint="Choose a record to see only what made it.">
				<ActivityBests bests={bests} api={api} />
			</Section>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>How you read</CardTitle>
						<CardDescription>
							Time by method, and how often countdowns ran to the end.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="flex flex-col gap-4">
							{overview.modes.map((mode) => {
								const Icon = MODE_ICONS[mode.mode];
								const share = totalModeSeconds
									? mode.seconds / totalModeSeconds
									: 0;
								return (
									<li key={mode.mode} className="flex flex-col gap-1.5">
										<div className="flex items-baseline justify-between gap-4 text-sm">
											<span className="flex items-center gap-1.5 font-medium">
												<Icon className="size-3.5" aria-hidden />
												{ACTIVITY_MODE_LABELS[mode.mode]}
											</span>
											<span className="tabular-nums">
												{formatActivityDuration(mode.seconds)}
												<span className="text-muted-foreground">
													{" "}
													in {plural(mode.sessions, "session")}
												</span>
											</span>
										</div>
										<Meter
											share={share}
											label={`${Math.round(share * 100)}% of the time`}
										/>
										{mode.targetRate != null ? (
											<p className="text-muted-foreground text-xs">
												Countdowns reached their target{" "}
												{Math.round(mode.targetRate * 100)}% of the time.
											</p>
										) : null}
									</li>
								);
							})}
						</ul>
					</CardContent>
				</Card>

				{scope.progress && overview.speedByMonth.length >= 2 ? (
					<Card>
						<CardHeader>
							<CardTitle>Reading speed by month</CardTitle>
							<CardDescription>
								{overview.usualSpeed
									? `Pages per hour. The usual speed is ${Math.round(overview.usualSpeed)}.`
									: "Pages per hour."}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={speedConfig} className="h-52 w-full">
								<AreaChart
									data={overview.speedByMonth.map((point) => ({
										label: shortMonth(point.month),
										speed: Math.round(point.speed),
									}))}
									margin={{ left: 0, right: 8, top: 8 }}
								>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										interval="preserveStartEnd"
										minTickGap={24}
									/>
									<YAxis allowDecimals={false} width={36} tickLine={false} />
									<ChartTooltip content={<ChartTooltipContent />} />
									<Area
										type="monotone"
										dataKey="speed"
										stroke="var(--color-speed)"
										fill="var(--color-speed)"
										fillOpacity={0.2}
									/>
								</AreaChart>
							</ChartContainer>
						</CardContent>
					</Card>
				) : null}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>What took the most time</CardTitle>
					<CardDescription>
						Choose a row to show only that in every view.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ActivityRankings rankings={overview.rankings} api={api} />
				</CardContent>
			</Card>

			{overview.finishedBlock ? (
				<FinishedBlock block={overview.finishedBlock} />
			) : null}
		</div>
	);
}

function FinishedBlock({
	block,
}: {
	block: NonNullable<Full["finishedBlock"]>;
}) {
	if (block.hidden) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Books finished</CardTitle>
					<CardDescription>
						These come from readings, not sessions, so they are hidden while you
						filter by method, length, pages, speed or similar. Filter by book or
						dates only to see them.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}
	if (block.count === 0) return null;
	return (
		<section className="flex flex-col gap-3">
			<h2 className="font-heading font-semibold text-lg tracking-tight">
				Books finished
			</h2>
			<div className="grid gap-3 sm:grid-cols-3">
				<StatCard
					icon={BookOpen}
					label="Finished"
					value={String(block.count)}
				/>
				<StatCard
					icon={Clock}
					label="Average time to finish"
					value={
						block.averageDays
							? plural(Math.round(block.averageDays), "day")
							: "n/a"
					}
				/>
				<StatCard
					icon={Files}
					label="Pages per day"
					value={
						block.pagesPerDay ? String(Math.round(block.pagesPerDay)) : "n/a"
					}
					hint="Across the finished books that have page counts."
				/>
			</div>
			{block.perMonth.length >= 2 ? (
				<Card>
					<CardContent>
						<ChartContainer config={finishedConfig} className="h-44 w-full">
							<BarChart
								data={block.perMonth.map((point) => ({
									label: shortMonth(point.month),
									count: point.count,
								}))}
								margin={{ left: 0, right: 8, top: 8 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									interval="preserveStartEnd"
									minTickGap={24}
								/>
								<YAxis allowDecimals={false} width={28} tickLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-count)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			) : null}
			<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{block.items.map((item) => (
					<li key={`${item.slug}-${item.finishedAt.toString()}`}>
						<Card size="sm" className="relative h-full">
							<CardContent className="flex items-center gap-3">
								<Cover coverId={item.coverId} className="w-12" sizes="48px" />
								<div className="flex min-w-0 flex-col gap-0.5">
									<Link
										href={`/books/${item.slug}` as Route}
										className="line-clamp-2 font-heading font-medium text-sm leading-snug after:absolute after:inset-0 hover:underline"
									>
										{item.title}
									</Link>
									<p className="truncate text-muted-foreground text-xs">
										{item.authors.join(", ")}
									</p>
									<p className="text-muted-foreground text-xs">
										Finished{" "}
										{formatDayLabel(item.finishedAt.toISOString().slice(0, 10))}
										, in {plural(item.days, "day")}
									</p>
								</div>
							</CardContent>
						</Card>
					</li>
				))}
			</ul>
		</section>
	);
}
