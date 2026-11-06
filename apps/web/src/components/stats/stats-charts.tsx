"use client";

import {
	type CumulativeMetric,
	type CumulativeReadPoint,
	normalizeCumulativeSeries,
} from "@bbrc/shared";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { useRouter } from "next/navigation";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ComposedChart,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";
import { StatsEmpty } from "./stats-kit";

/*
 * The charts the stats pages share. They only draw: the numbers are worked out on the
 * server, and anything that should open a list of books gets a `hrefFor`.
 */

export const METRIC_LABELS: Record<CumulativeMetric, string> = {
	books: "Books",
	pages: "Pages",
	authors: "Authors",
	countries: "Countries",
};

const METRIC_CONFIG: ChartConfig = {
	books: { label: "Books", color: "var(--chart-1)" },
	pages: { label: "Pages", color: "var(--chart-2)" },
	authors: { label: "Authors", color: "var(--chart-3)" },
	countries: { label: "Countries", color: "var(--chart-4)" },
};

const BAR_CONFIG: ChartConfig = {
	count: { label: "Books", color: "var(--chart-1)" },
};

/** A bar chart of counts. With `hrefFor`, a bar opens the books behind it. */
export function HistogramChart({
	points,
	hrefFor,
	label = "Books",
	className = "h-52",
	angled = false,
}: {
	points: readonly { label: string; count: number }[];
	hrefFor?: (label: string) => string | null;
	label?: string;
	className?: string;
	angled?: boolean;
}) {
	const router = useRouter();
	if (points.length === 0 || points.every((point) => point.count === 0)) {
		return <StatsEmpty>Nothing to show for this period.</StatsEmpty>;
	}
	return (
		<ChartContainer
			config={{ count: { ...BAR_CONFIG.count, label } }}
			className={`${className} w-full`}
		>
			<BarChart
				data={points as { label: string; count: number }[]}
				margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					interval={0}
					angle={angled ? -35 : 0}
					textAnchor={angled ? "end" : "middle"}
					height={angled ? 52 : 28}
					tickMargin={6}
				/>
				<YAxis
					allowDecimals={false}
					tickLine={false}
					axisLine={false}
					width={28}
					tickMargin={4}
				/>
				<ChartTooltip
					content={<ChartTooltipContent />}
					cursor={{ opacity: 0.08 }}
				/>
				<Bar
					dataKey="count"
					fill="var(--color-count)"
					cursor={hrefFor ? "pointer" : undefined}
					onClick={(entry) => {
						const href = hrefFor?.(
							String((entry as { label?: string }).label ?? ""),
						);
						if (href) router.push(href as never);
					}}
				/>
			</BarChart>
		</ChartContainer>
	);
}

/**
 * Cumulative totals over time. With one metric it shows real values; with several each is
 * a percentage of its own final value (their units differ) and the tooltip shows the real
 * numbers.
 */
export function CumulativeChart({
	points,
	metrics,
}: {
	points: readonly CumulativeReadPoint[];
	metrics: readonly CumulativeMetric[];
}) {
	if (points.length === 0 || metrics.length === 0) {
		return <StatsEmpty>Nothing to show for this period.</StatsEmpty>;
	}
	const relative = metrics.length > 1;
	const data = relative
		? normalizeCumulativeSeries(points, metrics)
		: (points as CumulativeReadPoint[]);

	return (
		<ChartContainer config={METRIC_CONFIG} className="h-64 w-full">
			<LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tickMargin={6}
					minTickGap={24}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					width={relative ? 36 : 40}
					tickMargin={4}
					allowDecimals={false}
					tickFormatter={(value: number) =>
						relative ? `${value}%` : String(value)
					}
					domain={relative ? [0, 100] : undefined}
				/>
				<ChartTooltip
					content={
						<ChartTooltipContent
							formatter={(value, name, item) => {
								const real = (
									item?.payload as
										| { values?: Record<string, number> }
										| undefined
								)?.values?.[String(name)];
								return (
									<span className="flex w-full items-center justify-between gap-4">
										<span className="text-muted-foreground">
											{METRIC_LABELS[name as CumulativeMetric] ?? name}
										</span>
										<span className="font-medium tabular-nums">
											{(real ?? Number(value)).toLocaleString("en-US")}
											{relative ? (
												<span className="ms-1 font-normal text-muted-foreground">
													({Number(value)}%)
												</span>
											) : null}
										</span>
									</span>
								);
							}}
						/>
					}
				/>
				{metrics.map((metric) => (
					<Line
						key={metric}
						type="monotone"
						dataKey={metric}
						stroke={`var(--color-${metric})`}
						strokeWidth={2}
						dot={false}
						activeDot={{ r: 3 }}
					/>
				))}
			</LineChart>
		</ChartContainer>
	);
}

/** Books or pages per month as columns, with a rolling average line over them. */
export function PaceChart({
	series,
	metric,
}: {
	series: readonly {
		label: string;
		books: number;
		pages: number;
		rollingBooks: number;
		rollingPages: number;
	}[];
	metric: "books" | "pages";
}) {
	if (series.length === 0) {
		return <StatsEmpty>Nothing to show for this period.</StatsEmpty>;
	}
	const rolling = metric === "books" ? "rollingBooks" : "rollingPages";
	const config: ChartConfig = {
		[metric]: { label: METRIC_LABELS[metric], color: "var(--chart-1)" },
		[rolling]: { label: "3-month average", color: "var(--chart-3)" },
	};
	return (
		<ChartContainer config={config} className="h-60 w-full">
			<ComposedChart
				data={[...series]}
				margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tickMargin={6}
					minTickGap={16}
				/>
				<YAxis
					allowDecimals={false}
					tickLine={false}
					axisLine={false}
					width={40}
					tickMargin={4}
				/>
				<ChartTooltip
					content={<ChartTooltipContent />}
					cursor={{ opacity: 0.08 }}
				/>
				<Bar dataKey={metric} fill={`var(--color-${metric})`} />
				<Line
					type="monotone"
					dataKey={rolling}
					stroke={`var(--color-${rolling})`}
					strokeWidth={2}
					dot={false}
				/>
			</ComposedChart>
		</ChartContainer>
	);
}

/** Two counts side by side for each label, such as sittings started and people who joined. */
export function GroupedBarsChart({
	points,
	first,
	second,
	className = "h-52",
}: {
	points: readonly { label: string; first: number; second: number }[];
	first: string;
	second: string;
	className?: string;
}) {
	if (points.every((point) => point.first === 0 && point.second === 0)) {
		return <StatsEmpty>Nothing to show for this period.</StatsEmpty>;
	}
	return (
		<ChartContainer
			config={{
				first: { label: first, color: "var(--chart-1)" },
				second: { label: second, color: "var(--chart-3)" },
			}}
			className={`${className} w-full`}
		>
			<BarChart
				data={points as { label: string; first: number; second: number }[]}
				margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					interval={0}
					tickMargin={6}
				/>
				<YAxis
					allowDecimals={false}
					tickLine={false}
					axisLine={false}
					width={28}
					tickMargin={4}
				/>
				<ChartTooltip
					content={<ChartTooltipContent />}
					cursor={{ opacity: 0.08 }}
				/>
				<Bar dataKey="first" fill="var(--color-first)" />
				<Bar dataKey="second" fill="var(--color-second)" />
			</BarChart>
		</ChartContainer>
	);
}
