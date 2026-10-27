"use client";

import type { AuthorInsightStatsOutput } from "@bbrc/api/modules/author-insights/author-insights.schema";
import { ChartContainer } from "@bbrc/ui/components/chart";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { Area, AreaChart } from "recharts";
import { formatNumberIn } from "@/components/blocks/author/author-stats-frame";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";

type Stats = AuthorInsightStatsOutput;
type Compared = Stats["cards"]["books"];

function Delta({
	stat,
	tone,
	unit,
}: {
	stat: Compared;
	tone: "up-good" | "neutral";
	unit?: string;
}) {
	const f = useFormatters();
	if (stat.delta == null) return null;

	const direction = stat.delta > 0 ? "up" : stat.delta < 0 ? "down" : "flat";
	const Icon =
		direction === "up"
			? ArrowUpRight
			: direction === "down"
				? ArrowDownRight
				: Minus;
	const amount =
		stat.deltaPercent != null
			? `${formatNumberIn(f, Math.abs(stat.deltaPercent), 0)}%`
			: `${formatNumberIn(f, Math.abs(stat.delta), 1)}${unit ?? ""}`;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 text-xs tabular-nums",
				direction === "flat" || tone === "neutral"
					? "text-muted-foreground"
					: direction === "up"
						? "text-success-ink"
						: "text-destructive",
			)}
			title={
				stat.previous != null
					? `${formatNumberIn(f, stat.previous, 1)} in the period before`
					: undefined
			}
		>
			<Icon className="size-3.5" aria-hidden />
			<span className="sr-only">
				{direction === "up"
					? "Up"
					: direction === "down"
						? "Down"
						: "Unchanged"}{" "}
				{direction === "flat" ? "" : "by "}
			</span>
			{direction === "flat" ? "No change" : amount}
		</span>
	);
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
	if (values.length < 2) {
		return <div className="h-8" aria-hidden />;
	}
	const data = values.map((value, index) => ({ index, value }));
	return (
		<ChartContainer
			config={{ value: { color } }}
			className="aspect-auto h-8 w-full"
			aria-hidden
		>
			<AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
				<Area
					dataKey="value"
					type="monotone"
					stroke="var(--color-value)"
					strokeWidth={1.5}
					fill="var(--color-value)"
					fillOpacity={0.18}
					isAnimationActive={false}
					dot={false}
				/>
			</AreaChart>
		</ChartContainer>
	);
}

function StatCard({
	label,
	value,
	suffix,
	hint,
	stat,
	tone = "up-good",
	deltaUnit,
	spark,
	color,
}: {
	label: string;
	value: string;
	suffix?: string;
	hint?: ReactNode;
	stat?: Compared;
	tone?: "up-good" | "neutral";
	deltaUnit?: string;
	spark?: number[];
	color: string;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1 border border-border bg-card p-3">
			<dt className="truncate text-muted-foreground text-xs">{label}</dt>
			<dd className="flex flex-col gap-1">
				<span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
					<span className="font-semibold text-2xl tabular-nums leading-none">
						{value}
						{suffix ? (
							<span className="ps-0.5 font-normal text-muted-foreground text-sm">
								{suffix}
							</span>
						) : null}
					</span>
					{stat ? <Delta stat={stat} tone={tone} unit={deltaUnit} /> : null}
				</span>
				{hint ? (
					<span className="truncate text-muted-foreground text-xs">{hint}</span>
				) : null}
				<Sparkline values={spark ?? []} color={color} />
			</dd>
		</div>
	);
}

/** The headline numbers, each with its change against the period before when a range is set. */
export function AuthorStatsCards({ stats }: { stats: Stats }) {
	const f = useFormatters();
	const { cards } = stats;
	const last = <T,>(rows: T[]) => rows.slice(-24);

	return (
		<dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<StatCard
				label="Books"
				value={formatNumberIn(f, cards.books.value)}
				hint={
					stats.scope.hasRange
						? "In the library"
						: `${formatNumberIn(f, stats.funnel.totals.read)} reads in all`
				}
				color="var(--chart-1)"
				spark={last(stats.publicationTimeline.map((row) => row.readCount))}
			/>
			<StatCard
				label="Readers"
				value={formatNumberIn(f, cards.readers.value)}
				stat={cards.readers}
				hint="Members with a read"
				color="var(--chart-2)"
				spark={last(stats.readersGrowth.map((row) => row.total))}
			/>
			<StatCard
				label="Reads"
				value={formatNumberIn(f, cards.reads.value)}
				stat={cards.reads}
				hint={
					stats.scope.undatedReads > 0
						? `${formatNumberIn(f, stats.scope.undatedReads)} without a date`
						: undefined
				}
				color="var(--chart-1)"
				spark={last(stats.readsPerMonth.map((row) => row.count))}
			/>
			<StatCard
				label="Reviews"
				value={formatNumberIn(f, cards.reviews.value)}
				stat={cards.reviews}
				color="var(--chart-3)"
				spark={last(stats.reviewsPerMonth.map((row) => row.count))}
			/>
			<StatCard
				label="Average rating"
				value={
					cards.averageRating.value > 0
						? formatNumberIn(f, cards.averageRating.value, 2)
						: "–"
				}
				suffix={cards.averageRating.value > 0 ? "/ 5" : undefined}
				stat={cards.averageRating}
				deltaUnit=""
				color="var(--chart-4)"
				spark={last(stats.ratingOverTime.map((row) => row.average))}
			/>
			<StatCard
				label="Pages read"
				value={formatNumberIn(f, cards.pagesRead.value)}
				stat={cards.pagesRead}
				hint="One count per read"
				color="var(--chart-5)"
			/>
			<StatCard
				label="Days to finish"
				value={
					cards.averageDaysToFinish.value > 0
						? formatNumberIn(f, cards.averageDaysToFinish.value, 1)
						: "–"
				}
				suffix={cards.averageDaysToFinish.value > 0 ? "days" : undefined}
				stat={cards.averageDaysToFinish}
				tone="neutral"
				deltaUnit=" d"
				hint={
					stats.readingTime.medianDays != null
						? `Median ${formatNumberIn(f, stats.readingTime.medianDays, 1)} days`
						: "From finished readings"
				}
				color="var(--chart-2)"
			/>
			<StatCard
				label="Followers"
				value={formatNumberIn(f, cards.followers.value)}
				stat={cards.followers}
				hint={stats.scope.hasRange ? "New in this period" : "All time"}
				color="var(--chart-3)"
				spark={last(stats.followerGrowth.map((row) => row.total))}
			/>
		</dl>
	);
}
