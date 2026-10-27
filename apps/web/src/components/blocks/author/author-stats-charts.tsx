"use client";

import type { AuthorInsightStatsOutput } from "@bbrc/api/modules/author-insights/author-insights.schema";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { ToggleGroup, ToggleGroupItem } from "@bbrc/ui/components/toggle-group";
import type { Route } from "next";
import { useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	Scatter,
	ScatterChart,
	XAxis,
	YAxis,
	ZAxis,
} from "recharts";
import {
	ChartEmpty,
	ChartFrame,
	formatMonthKey,
	formatNumberIn,
	MONTH_NAMES_SHORT,
	monthKeyToRange,
	SeriesLegend,
	truncate,
	yearToRange,
} from "@/components/blocks/author/author-stats-frame";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { Link } from "@/i18n/navigation";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";

type Stats = AuthorInsightStatsOutput;
type Range = { from: string; to: string };

export type StatsChartActions = {
	/** Click a book bar or dot: add it to (or remove it from) the book filter. */
	onToggleBook: (slug: string) => void;
	onToggleReader: (username: string) => void;
	/** Click a month or a year: narrow the date range to it. */
	onPickRange: (range: Range) => void;
	selectedBooks: readonly string[];
	selectedReaders: readonly string[];
};

const C1 = "var(--chart-1)";
const C2 = "var(--chart-2)";
const C3 = "var(--chart-3)";
const C4 = "var(--chart-4)";
const C5 = "var(--chart-5)";

const noGridClass = "aspect-auto";

// ── Activity over time ─────────────────────────────────────────────────────

const ACTIVITY_SERIES = [
	{ key: "reads", label: "Reads", color: C1 },
	{ key: "reviews", label: "Reviews", color: C3 },
	{ key: "readers", label: "New readers", color: C2 },
	{ key: "followers", label: "New followers", color: C5 },
] as const;

export function ActivityChart({
	stats,
	actions,
}: {
	stats: Stats;
	actions: StatsChartActions;
}) {
	const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
	const rows = new Map<
		string,
		{
			month: string;
			reads: number;
			reviews: number;
			readers: number;
			followers: number;
		}
	>();
	const row = (month: string) => {
		let current = rows.get(month);
		if (!current) {
			current = { month, reads: 0, reviews: 0, readers: 0, followers: 0 };
			rows.set(month, current);
		}
		return current;
	};
	for (const point of stats.readsPerMonth) row(point.month).reads = point.count;
	for (const point of stats.reviewsPerMonth)
		row(point.month).reviews = point.count;
	for (const point of stats.readersGrowth)
		row(point.month).readers = point.count;
	for (const point of stats.followerGrowth)
		row(point.month).followers = point.count;
	const data = [...rows.values()].sort((a, b) =>
		a.month.localeCompare(b.month),
	);

	const config = Object.fromEntries(
		ACTIVITY_SERIES.map((item) => [
			item.key,
			{ label: item.label, color: item.color },
		]),
	) as ChartConfig;

	return (
		<ChartFrame
			title="Activity by month"
			description="Click a month to look at just that month. Switch lines on and off below."
			className="lg:col-span-2"
			table={{
				columns: ["Month", ...ACTIVITY_SERIES.map((item) => item.label)],
				rows: data.map((point) => [
					formatMonthKey(point.month),
					point.reads,
					point.reviews,
					point.readers,
					point.followers,
				]),
			}}
			footer={
				<SeriesLegend
					series={ACTIVITY_SERIES.map((item) => ({ ...item }))}
					hidden={hidden}
					onToggle={(key) =>
						setHidden((current) => {
							const next = new Set(current);
							if (next.has(key)) next.delete(key);
							else next.add(key);
							return next;
						})
					}
				/>
			}
		>
			{data.length === 0 ? (
				<ChartEmpty />
			) : (
				<ChartContainer
					config={config}
					className="aspect-auto h-64 w-full sm:h-72"
					role="img"
					aria-label={`Reads, reviews, new readers and new followers for each of ${data.length} months`}
				>
					<LineChart
						data={data}
						margin={{ left: 0, right: 8, top: 8 }}
						onClick={(state) => {
							const month = state?.activeLabel;
							const range =
								typeof month === "string" ? monthKeyToRange(month) : null;
							if (range) actions.onPickRange(range);
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							minTickGap={24}
							tickMargin={8}
							tickFormatter={formatMonthKey}
						/>
						<YAxis
							width={32}
							tickLine={false}
							axisLine={false}
							allowDecimals={false}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(_, payload) =>
										formatMonthKey(String(payload?.[0]?.payload?.month ?? ""))
									}
								/>
							}
						/>
						{ACTIVITY_SERIES.filter((item) => !hidden.has(item.key)).map(
							(item) => (
								<Line
									key={item.key}
									dataKey={item.key}
									type="monotone"
									stroke={`var(--color-${item.key})`}
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4 }}
									isAnimationActive={false}
								/>
							),
						)}
					</LineChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

// ── Growth (cumulative) ────────────────────────────────────────────────────

export function GrowthChart({ stats }: { stats: Stats }) {
	const [mode, setMode] = useState<"readers" | "followers">("readers");
	const source =
		mode === "readers" ? stats.readersGrowth : stats.followerGrowth;
	const color = mode === "readers" ? C2 : C5;
	const label = mode === "readers" ? "Readers" : "Followers";

	return (
		<ChartFrame
			title="Growth over time"
			description="Running total, month by month."
			actions={
				<ToggleGroup
					value={[mode]}
					onValueChange={(value) => {
						const next = value[0];
						if (next === "readers" || next === "followers") setMode(next);
					}}
					variant="outline"
					size="sm"
					aria-label="Growth of"
				>
					<ToggleGroupItem value="readers">Readers</ToggleGroupItem>
					<ToggleGroupItem value="followers">Followers</ToggleGroupItem>
				</ToggleGroup>
			}
			table={{
				columns: ["Month", "New", "Total"],
				rows: source.map((point) => [
					formatMonthKey(point.month),
					point.count,
					point.total,
				]),
			}}
		>
			{source.length === 0 ? (
				<ChartEmpty />
			) : (
				<ChartContainer
					config={{ total: { label, color } }}
					className={cn(noGridClass, "h-56 w-full")}
					role="img"
					aria-label={`${label} total by month, now ${source.at(-1)?.total ?? 0}`}
				>
					<AreaChart data={source} margin={{ left: 0, right: 8, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							minTickGap={24}
							tickMargin={8}
							tickFormatter={formatMonthKey}
						/>
						<YAxis
							width={32}
							tickLine={false}
							axisLine={false}
							allowDecimals={false}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(_, payload) =>
										formatMonthKey(String(payload?.[0]?.payload?.month ?? ""))
									}
								/>
							}
						/>
						<Area
							dataKey="total"
							type="stepAfter"
							stroke="var(--color-total)"
							strokeWidth={2}
							fill="var(--color-total)"
							fillOpacity={0.2}
							isAnimationActive={false}
						/>
					</AreaChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

// ── Reads per year ─────────────────────────────────────────────────────────

export function YearsChart({
	stats,
	actions,
}: {
	stats: Stats;
	actions: StatsChartActions;
}) {
	const data = stats.readsPerYear;
	return (
		<ChartFrame
			title="Reads per year"
			description="Click a bar to look at that year."
			table={{
				columns: ["Year", "Reads"],
				rows: data.map((point) => [point.year, point.count]),
			}}
		>
			{data.length === 0 ? (
				<ChartEmpty />
			) : (
				<ChartContainer
					config={{ count: { label: "Reads", color: C1 } }}
					className="aspect-auto h-56 w-full"
					role="img"
					aria-label={`Reads for each of ${data.length} years`}
				>
					<BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="year"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
						/>
						<YAxis
							width={32}
							tickLine={false}
							axisLine={false}
							allowDecimals={false}
						/>
						<ChartTooltip
							cursor={{ fill: "var(--muted)" }}
							content={<ChartTooltipContent hideIndicator />}
						/>
						<Bar
							dataKey="count"
							fill="var(--color-count)"
							radius={[2, 2, 0, 0]}
							cursor="pointer"
							isAnimationActive={false}
							onClick={(entry) => {
								const year = (entry as unknown as { year?: number }).year;
								if (typeof year === "number") {
									actions.onPickRange(yearToRange(year));
								}
							}}
						/>
					</BarChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

// ── Seasonality (a heat strip) ─────────────────────────────────────────────

export function SeasonChart({ stats }: { stats: Stats }) {
	const f = useFormatters();
	const data = stats.readsByMonthOfYear;
	const max = Math.max(1, ...data.map((point) => point.count));
	const total = data.reduce((sum, point) => sum + point.count, 0);
	const peak = data.reduce<(typeof data)[number] | null>(
		(best, point) => (point.count > (best?.count ?? 0) ? point : best),
		null,
	);

	return (
		<ChartFrame
			title="Which months people finish it"
			description={
				peak && total > 0
					? `${MONTH_NAMES_SHORT[peak.month - 1]} is the busiest month, with ${formatNumberIn(f, peak.count)} of ${formatNumberIn(f, total)} reads.`
					: "Reads by calendar month, every year together."
			}
			table={{
				columns: ["Month", "Reads"],
				rows: data.map((point) => [
					MONTH_NAMES_SHORT[point.month - 1] ?? point.month,
					point.count,
				]),
			}}
		>
			{total === 0 ? (
				<ChartEmpty />
			) : (
				<ul
					className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
					aria-label="Reads by calendar month"
				>
					{data.map((point) => {
						const share = point.count / max;
						return (
							<li
								key={point.month}
								title={`${MONTH_NAMES_SHORT[point.month - 1]}: ${point.count} ${point.count === 1 ? "read" : "reads"}`}
								className="flex flex-col items-stretch gap-1"
							>
								<div className="relative flex h-16 items-end border border-border bg-muted/40">
									<div
										className="w-full bg-chart-1"
										style={{
											height: `${Math.max(share * 100, point.count > 0 ? 6 : 0)}%`,
											opacity: 0.35 + share * 0.65,
										}}
									/>
								</div>
								<span className="text-center text-muted-foreground text-xs">
									{MONTH_NAMES_SHORT[point.month - 1]}
								</span>
								<span className="text-center text-xs tabular-nums">
									{point.count}
								</span>
							</li>
						);
					})}
				</ul>
			)}
		</ChartFrame>
	);
}

// ── Books: one axis, four measures ─────────────────────────────────────────

const BOOK_MEASURES = [
	{ value: "reads", label: "Reads" },
	{ value: "rating", label: "Rating" },
	{ value: "funnel", label: "Shelf status" },
	{ value: "time", label: "Days to finish" },
] as const;

type BookMeasure = (typeof BOOK_MEASURES)[number]["value"];

const TOP_BOOKS = 10;

export function BooksChart({
	stats,
	actions,
}: {
	stats: Stats;
	actions: StatsChartActions;
}) {
	const [measure, setMeasure] = useState<BookMeasure>("reads");
	const [showAll, setShowAll] = useState(false);
	const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

	const readsRows = [...stats.readsPerBook].sort(
		(a, b) => b.readCount - a.readCount,
	);
	const ratingRows = stats.ratingsPerBook
		.filter((row) => row.average != null)
		.sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
	const funnelRows = [...stats.funnel.perBook].sort(
		(a, b) =>
			b.read + b.readingNow + b.wishlist - (a.read + a.readingNow + a.wishlist),
	);
	const timeRows = [...stats.readingTime.perBook].sort(
		(a, b) => a.averageDays - b.averageDays,
	);

	type Row = { slug: string; title: string } & Record<string, number | string>;
	let rows: Row[] = [];
	let keys: { key: string; label: string; color: string }[] = [];
	let table: { columns: string[]; rows: (string | number)[][] } = {
		columns: [],
		rows: [],
	};

	if (measure === "reads") {
		rows = readsRows.map((row) => ({
			slug: row.book.slug,
			title: row.book.title,
			reads: row.readCount,
		}));
		keys = [{ key: "reads", label: "Reads", color: C1 }];
		table = {
			columns: ["Book", "Reads"],
			rows: rows.map((row) => [row.title, row.reads as number]),
		};
	} else if (measure === "rating") {
		rows = ratingRows.map((row) => ({
			slug: row.book.slug,
			title: row.book.title,
			rating: Number((row.average ?? 0).toFixed(2)),
		}));
		keys = [{ key: "rating", label: "Average rating", color: C4 }];
		table = {
			columns: ["Book", "Average rating", "Reviews"],
			rows: ratingRows.map((row) => [
				row.book.title,
				Number((row.average ?? 0).toFixed(2)),
				row.reviewCount,
			]),
		};
	} else if (measure === "funnel") {
		rows = funnelRows.map((row) => ({
			slug: row.book.slug,
			title: row.book.title,
			read: row.read,
			readingNow: row.readingNow,
			wishlist: row.wishlist,
		}));
		keys = [
			{ key: "read", label: "Read", color: C1 },
			{ key: "readingNow", label: "Reading now", color: C2 },
			{ key: "wishlist", label: "On a wishlist", color: C5 },
		];
		table = {
			columns: ["Book", "Read", "Reading now", "Wishlist"],
			rows: funnelRows.map((row) => [
				row.book.title,
				row.read,
				row.readingNow,
				row.wishlist,
			]),
		};
	} else {
		rows = timeRows.map((row) => ({
			slug: row.book.slug,
			title: row.book.title,
			days: Number(row.averageDays.toFixed(1)),
		}));
		keys = [{ key: "days", label: "Days to finish", color: C2 }];
		table = {
			columns: ["Book", "Average days", "Readers"],
			rows: timeRows.map((row) => [
				row.book.title,
				Number(row.averageDays.toFixed(1)),
				row.readers,
			]),
		};
	}

	const visible = showAll ? rows : rows.slice(0, TOP_BOOKS);
	const config = Object.fromEntries(
		keys.map((item) => [item.key, { label: item.label, color: item.color }]),
	) as ChartConfig;
	const activeKeys = keys.filter((item) => !hidden.has(item.key));
	const stacked = measure === "funnel";

	return (
		<ChartFrame
			title="Book by book"
			description="Click a bar to filter everything on this page to that book."
			className="lg:col-span-2"
			actions={
				<ToggleGroup
					value={[measure]}
					onValueChange={(value) => {
						const next = value[0] as BookMeasure | undefined;
						if (next) setMeasure(next);
					}}
					variant="outline"
					size="sm"
					aria-label="Measure"
				>
					{BOOK_MEASURES.map((item) => (
						<ToggleGroupItem key={item.value} value={item.value}>
							{item.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			}
			table={table}
			footer={
				<div className="flex flex-wrap items-center justify-between gap-2">
					{stacked ? (
						<SeriesLegend
							series={keys}
							hidden={hidden}
							onToggle={(key) =>
								setHidden((current) => {
									const next = new Set(current);
									if (next.has(key)) next.delete(key);
									else next.add(key);
									return next;
								})
							}
						/>
					) : (
						<span />
					)}
					{rows.length > TOP_BOOKS ? (
						<button
							type="button"
							className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
							onClick={() => setShowAll((value) => !value)}
						>
							{showAll ? "Show the top 10" : `Show all ${rows.length} books`}
						</button>
					) : null}
				</div>
			}
		>
			{visible.length === 0 ? (
				<ChartEmpty />
			) : (
				<ChartContainer
					config={config}
					className="aspect-auto w-full"
					style={{ height: Math.max(180, visible.length * 34 + 28) }}
					role="img"
					aria-label={`${BOOK_MEASURES.find((item) => item.value === measure)?.label} for ${visible.length} books`}
				>
					<BarChart
						data={visible}
						layout="vertical"
						margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
						barCategoryGap={6}
					>
						<CartesianGrid horizontal={false} />
						<XAxis
							type="number"
							tickLine={false}
							axisLine={false}
							allowDecimals={measure === "rating" || measure === "time"}
							domain={measure === "rating" ? [0, 5] : undefined}
						/>
						<YAxis
							type="category"
							dataKey="title"
							width={132}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value: string) => truncate(value, 22)}
						/>
						<ChartTooltip
							cursor={{ fill: "var(--muted)" }}
							content={<ChartTooltipContent hideIndicator={!stacked} />}
						/>
						{activeKeys.map((item, index) => (
							<Bar
								key={item.key}
								dataKey={item.key}
								stackId={stacked ? "shelf" : undefined}
								fill={`var(--color-${item.key})`}
								radius={
									stacked
										? index === activeKeys.length - 1
											? [0, 2, 2, 0]
											: 0
										: [0, 2, 2, 0]
								}
								cursor="pointer"
								isAnimationActive={false}
								onClick={(entry) => {
									const slug = (entry as unknown as { slug?: string }).slug;
									if (slug) actions.onToggleBook(slug);
								}}
							>
								{visible.map((row) => (
									<Cell
										key={row.slug}
										fillOpacity={
											actions.selectedBooks.length === 0 ||
											actions.selectedBooks.includes(row.slug)
												? 1
												: 0.35
										}
									/>
								))}
							</Bar>
						))}
					</BarChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

// ── Ratings ────────────────────────────────────────────────────────────────

export function RatingDistributionChart({ stats }: { stats: Stats }) {
	const f = useFormatters();
	const data = stats.ratingDistribution;
	const total = data.reduce((sum, point) => sum + point.count, 0);

	return (
		<ChartFrame
			title="How the books are rated"
			description={
				total > 0
					? `${formatNumberIn(f, total)} ratings in half-star steps.`
					: "Half-star steps from 0.5 to 5."
			}
			table={{
				columns: ["Rating", "Reviews"],
				rows: data.map((point) => [point.rating, point.count]),
			}}
		>
			{total === 0 ? (
				<ChartEmpty />
			) : (
				<ChartContainer
					config={{ count: { label: "Reviews", color: C4 } }}
					className="aspect-auto h-56 w-full"
					role="img"
					aria-label={`Ratings from 0.5 to 5, ${total} in all`}
				>
					<BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="rating"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(value: number) => value.toFixed(1)}
						/>
						<YAxis
							width={32}
							tickLine={false}
							axisLine={false}
							allowDecimals={false}
						/>
						<ChartTooltip
							cursor={{ fill: "var(--muted)" }}
							content={
								<ChartTooltipContent
									hideIndicator
									labelFormatter={(_, payload) =>
										`${Number(payload?.[0]?.payload?.rating ?? 0).toFixed(1)} stars`
									}
								/>
							}
						/>
						<Bar
							dataKey="count"
							fill="var(--color-count)"
							radius={[2, 2, 0, 0]}
							isAnimationActive={false}
						/>
					</BarChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

export function RatingOverTimeChart({
	stats,
	actions,
}: {
	stats: Stats;
	actions: StatsChartActions;
}) {
	const data = stats.ratingOverTime;
	return (
		<ChartFrame
			title="Rating over time"
			description="The average rating of the reviews written each month."
			table={{
				columns: ["Month", "Average", "Reviews"],
				rows: data.map((point) => [
					formatMonthKey(point.month),
					Number(point.average.toFixed(2)),
					point.count,
				]),
			}}
		>
			{data.length === 0 ? (
				<ChartEmpty />
			) : (
				<ChartContainer
					config={{ average: { label: "Average rating", color: C4 } }}
					className="aspect-auto h-56 w-full"
					role="img"
					aria-label="Average rating by month"
				>
					<LineChart
						data={data}
						margin={{ left: 0, right: 8, top: 8 }}
						onClick={(state) => {
							const month = state?.activeLabel;
							const range =
								typeof month === "string" ? monthKeyToRange(month) : null;
							if (range) actions.onPickRange(range);
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							minTickGap={24}
							tickMargin={8}
							tickFormatter={formatMonthKey}
						/>
						<YAxis
							width={32}
							tickLine={false}
							axisLine={false}
							domain={[0, 5]}
							ticks={[0, 1, 2, 3, 4, 5]}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(_, payload) =>
										formatMonthKey(String(payload?.[0]?.payload?.month ?? ""))
									}
								/>
							}
						/>
						<Line
							dataKey="average"
							type="monotone"
							stroke="var(--color-average)"
							strokeWidth={2}
							dot={{ r: 3 }}
							activeDot={{ r: 5 }}
							isAnimationActive={false}
						/>
					</LineChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

// ── Shelf funnel (donut) ───────────────────────────────────────────────────

export function FunnelDonut({ stats }: { stats: Stats }) {
	const f = useFormatters();
	const { read, readingNow, wishlist } = stats.funnel.totals;
	const data = [
		{ key: "read", label: "Read", value: read, fill: C1 },
		{ key: "readingNow", label: "Reading now", value: readingNow, fill: C2 },
		{ key: "wishlist", label: "On a wishlist", value: wishlist, fill: C5 },
	];
	const total = read + readingNow + wishlist;

	return (
		<ChartFrame
			title="Where members are with it"
			description="Read, reading right now, and wishlisted."
			table={{
				columns: ["Status", "Members"],
				rows: data.map((item) => [item.label, item.value]),
			}}
		>
			{total === 0 ? (
				<ChartEmpty />
			) : (
				<div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-around">
					<ChartContainer
						config={Object.fromEntries(
							data.map((item) => [
								item.key,
								{ label: item.label, color: item.fill },
							]),
						)}
						className="aspect-square h-48"
						role="img"
						aria-label={`${read} read, ${readingNow} reading now, ${wishlist} on wishlists`}
					>
						<PieChart>
							<ChartTooltip
								content={<ChartTooltipContent nameKey="key" hideLabel />}
							/>
							<Pie
								data={data}
								dataKey="value"
								nameKey="key"
								innerRadius={52}
								outerRadius={80}
								strokeWidth={2}
								stroke="var(--card)"
								isAnimationActive={false}
							>
								{data.map((item) => (
									<Cell key={item.key} fill={`var(--color-${item.key})`} />
								))}
							</Pie>
						</PieChart>
					</ChartContainer>
					<ul className="flex flex-col gap-1.5 text-sm">
						{data.map((item) => (
							<li key={item.key} className="flex items-center gap-2">
								<span
									aria-hidden
									className="size-2.5"
									style={{ backgroundColor: item.fill }}
								/>
								<span className="text-muted-foreground">{item.label}</span>
								<span className="ms-auto ps-4 font-medium tabular-nums">
									{formatNumberIn(f, item.value)}
								</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</ChartFrame>
	);
}

// ── Reading time ───────────────────────────────────────────────────────────

export function ReadingTimeChart({ stats }: { stats: Stats }) {
	const f = useFormatters();
	const { distribution, finishedCount, medianDays, averageDays } =
		stats.readingTime;
	return (
		<ChartFrame
			title="How long it takes to finish"
			description={
				finishedCount > 0 && medianDays != null && averageDays != null
					? `Median ${formatNumberIn(f, medianDays, 1)} days, average ${formatNumberIn(f, averageDays, 1)}, from ${formatNumberIn(f, finishedCount)} finished readings.`
					: "From readings members started and finished here."
			}
			table={{
				columns: ["Days", "Readings"],
				rows: distribution.map((item) => [item.label, item.count]),
			}}
		>
			{finishedCount === 0 ? (
				<ChartEmpty>No finished readings yet.</ChartEmpty>
			) : (
				<ChartContainer
					config={{ count: { label: "Readings", color: C2 } }}
					className="aspect-auto h-56 w-full"
					role="img"
					aria-label="Readings grouped by days to finish"
				>
					<BarChart data={distribution} margin={{ left: 0, right: 8, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
						/>
						<YAxis
							width={32}
							tickLine={false}
							axisLine={false}
							allowDecimals={false}
						/>
						<ChartTooltip
							cursor={{ fill: "var(--muted)" }}
							content={<ChartTooltipContent hideIndicator />}
						/>
						<Bar
							dataKey="count"
							fill="var(--color-count)"
							radius={[2, 2, 0, 0]}
							isAnimationActive={false}
						/>
					</BarChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

// ── Publication: decades and the timeline ──────────────────────────────────

export function DecadesChart({ stats }: { stats: Stats }) {
	const data = stats.booksPerDecade.map((point) => ({
		...point,
		label: `${point.decade}s`,
	}));
	return (
		<ChartFrame
			title="Books by decade"
			description="When the books were first published."
			table={{
				columns: ["Decade", "Books"],
				rows: data.map((point) => [point.label, point.count]),
			}}
		>
			{data.length === 0 ? (
				<ChartEmpty />
			) : (
				<ChartContainer
					config={{ count: { label: "Books", color: C3 } }}
					className="aspect-auto h-56 w-full"
					role="img"
					aria-label="Number of books for each decade of publication"
				>
					<BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={12}
						/>
						<YAxis
							width={32}
							tickLine={false}
							axisLine={false}
							allowDecimals={false}
						/>
						<ChartTooltip
							cursor={{ fill: "var(--muted)" }}
							content={<ChartTooltipContent hideIndicator />}
						/>
						<Bar
							dataKey="count"
							fill="var(--color-count)"
							radius={[2, 2, 0, 0]}
							isAnimationActive={false}
						/>
					</BarChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

export function TimelineChart({
	stats,
	actions,
}: {
	stats: Stats;
	actions: StatsChartActions;
}) {
	const data = stats.publicationTimeline.map((row) => ({
		slug: row.book.slug,
		title: row.book.title,
		year: row.publishedIn,
		reads: row.readCount,
		rating: row.average ?? 0,
		pages: row.pages,
	}));

	return (
		<ChartFrame
			title="Each book on a timeline"
			description="Year published across, reads up. Bigger dots are longer books. Click a dot to filter to that book."
			className="lg:col-span-2"
			table={{
				columns: ["Book", "Year", "Reads", "Average rating", "Pages"],
				rows: data.map((row) => [
					row.title,
					row.year,
					row.reads,
					row.rating > 0 ? Number(row.rating.toFixed(2)) : "–",
					row.pages,
				]),
			}}
		>
			{data.length === 0 ? (
				<ChartEmpty />
			) : (
				<ChartContainer
					config={{ reads: { label: "Reads", color: C1 } }}
					className="aspect-auto h-64 w-full"
					role="img"
					aria-label={`${data.length} books by year of publication and number of reads`}
				>
					<ScatterChart margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
						<CartesianGrid />
						<XAxis
							type="number"
							dataKey="year"
							name="Year"
							domain={["dataMin - 5", "dataMax + 5"]}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value: number) => String(Math.round(value))}
						/>
						<YAxis
							type="number"
							dataKey="reads"
							name="Reads"
							width={32}
							tickLine={false}
							axisLine={false}
							allowDecimals={false}
						/>
						<ZAxis type="number" dataKey="pages" range={[50, 300]} />
						<ChartTooltip
							cursor={{ strokeDasharray: "3 3" }}
							content={({ active, payload }) => {
								const point = payload?.[0]?.payload as
									| (typeof data)[number]
									| undefined;
								if (!active || !point) return null;
								return (
									<div className="grid gap-0.5 border border-border bg-background px-2.5 py-1.5 text-xs shadow-xl">
										<span className="font-medium">{point.title}</span>
										<span className="text-muted-foreground tabular-nums">
											{point.year} · {point.reads}{" "}
											{point.reads === 1 ? "read" : "reads"}
											{point.rating > 0
												? ` · ${point.rating.toFixed(1)} stars`
												: ""}
											{point.pages > 0 ? ` · ${point.pages} pages` : ""}
										</span>
									</div>
								);
							}}
						/>
						<Scatter
							data={data}
							fill="var(--color-reads)"
							cursor="pointer"
							isAnimationActive={false}
							onClick={(entry) => {
								const slug = (entry as unknown as { slug?: string }).slug;
								if (slug) actions.onToggleBook(slug);
							}}
						>
							{data.map((row) => (
								<Cell
									key={row.slug}
									fillOpacity={
										actions.selectedBooks.length === 0 ||
										actions.selectedBooks.includes(row.slug)
											? 0.85
											: 0.3
									}
								/>
							))}
						</Scatter>
					</ScatterChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

// ── Subjects, countries, pages ─────────────────────────────────────────────

function HorizontalBars({
	rows,
	color,
	unit,
	ariaLabel,
}: {
	rows: { key: string; label: string; count: number }[];
	color: string;
	unit: string;
	ariaLabel: string;
}) {
	return (
		<ChartContainer
			config={{ count: { label: unit, color } }}
			className="aspect-auto w-full"
			style={{ height: Math.max(160, rows.length * 30 + 24) }}
			role="img"
			aria-label={ariaLabel}
		>
			<BarChart
				data={rows}
				layout="vertical"
				margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
				barCategoryGap={6}
			>
				<CartesianGrid horizontal={false} />
				<XAxis
					type="number"
					tickLine={false}
					axisLine={false}
					allowDecimals={false}
				/>
				<YAxis
					type="category"
					dataKey="label"
					width={112}
					tickLine={false}
					axisLine={false}
					tickFormatter={(value: string) => truncate(value, 18)}
				/>
				<ChartTooltip
					cursor={{ fill: "var(--muted)" }}
					content={<ChartTooltipContent hideIndicator />}
				/>
				<Bar
					dataKey="count"
					fill="var(--color-count)"
					radius={[0, 2, 2, 0]}
					isAnimationActive={false}
				/>
			</BarChart>
		</ChartContainer>
	);
}

export function SubjectsChart({ stats }: { stats: Stats }) {
	const rows = stats.subjects.slice(0, 10).map((item) => ({
		key: item.subject,
		label: item.subject,
		count: item.count,
	}));
	return (
		<ChartFrame
			title="What the books are about"
			description="Most common subjects, one count per read."
			table={{
				columns: ["Subject", "Reads"],
				rows: stats.subjects.map((item) => [item.subject, item.count]),
			}}
		>
			{rows.length === 0 ? (
				<ChartEmpty />
			) : (
				<HorizontalBars
					rows={rows}
					color={C3}
					unit="Reads"
					ariaLabel={`Top ${rows.length} subjects`}
				/>
			)}
		</ChartFrame>
	);
}

export function CountriesChart({ stats }: { stats: Stats }) {
	const rows = stats.originCountries.slice(0, 8);
	const total = rows.reduce((sum, item) => sum + item.count, 0);
	const palette = [C1, C2, C3, C4, C5];

	return (
		<ChartFrame
			title="Where the books come from"
			description="Literary origin of the books read."
			table={{
				columns: ["Country", "Reads"],
				rows: stats.originCountries.map((item) => [item.name, item.count]),
			}}
		>
			{rows.length === 0 ? (
				<ChartEmpty />
			) : (
				<div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-around">
					<ChartContainer
						config={Object.fromEntries(
							rows.map((item, index) => [
								item.code,
								{ label: item.name, color: palette[index % palette.length] },
							]),
						)}
						className="aspect-square h-48"
						role="img"
						aria-label={`Reads by country, ${rows.length} countries`}
					>
						<PieChart>
							<ChartTooltip
								content={<ChartTooltipContent nameKey="code" hideLabel />}
							/>
							<Pie
								data={rows}
								dataKey="count"
								nameKey="code"
								innerRadius={44}
								outerRadius={80}
								strokeWidth={2}
								stroke="var(--card)"
								isAnimationActive={false}
							>
								{rows.map((item) => (
									<Cell key={item.code} fill={`var(--color-${item.code})`} />
								))}
							</Pie>
						</PieChart>
					</ChartContainer>
					<ul className="flex flex-col gap-1.5 text-sm">
						{rows.slice(0, 6).map((item, index) => (
							<li key={item.code} className="flex items-center gap-2">
								<span
									aria-hidden
									className="size-2.5"
									style={{ backgroundColor: palette[index % palette.length] }}
								/>
								<span className="truncate">{item.name}</span>
								<span className="ms-auto ps-4 text-muted-foreground tabular-nums">
									{total > 0 ? Math.round((item.count / total) * 100) : 0}%
								</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</ChartFrame>
	);
}

export function PagesChart({ stats }: { stats: Stats }) {
	const data = stats.pageCounts;
	const total = data.reduce((sum, item) => sum + item.count, 0);
	return (
		<ChartFrame
			title="How long the books are"
			description="Number of books by page count."
			table={{
				columns: ["Pages", "Books"],
				rows: data.map((item) => [item.label, item.count]),
			}}
		>
			{total === 0 ? (
				<ChartEmpty />
			) : (
				<ChartContainer
					config={{ count: { label: "Books", color: C5 } }}
					className="aspect-auto h-56 w-full"
					role="img"
					aria-label="Books grouped by page count"
				>
					<BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={8}
						/>
						<YAxis
							width={32}
							tickLine={false}
							axisLine={false}
							allowDecimals={false}
						/>
						<ChartTooltip
							cursor={{ fill: "var(--muted)" }}
							content={<ChartTooltipContent hideIndicator />}
						/>
						<Bar
							dataKey="count"
							fill="var(--color-count)"
							radius={[2, 2, 0, 0]}
							isAnimationActive={false}
						/>
					</BarChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

// ── Readers leaderboard ────────────────────────────────────────────────────

export function LeaderboardList({
	stats,
	actions,
}: {
	stats: Stats;
	actions: StatsChartActions;
}) {
	const rows = stats.leaderboard;
	return (
		<ChartFrame
			title="Who has read the most"
			description="Members by number of their books they finished. Click a member to look at their reads."
			table={{
				columns: ["Member", "Books read", "Of"],
				rows: rows.map((row) => [
					row.member.name,
					row.readCount,
					row.totalBooks,
				]),
			}}
		>
			{rows.length === 0 ? (
				<ChartEmpty />
			) : (
				<ol className="flex flex-col">
					{rows.map((row, index) => {
						const share =
							row.totalBooks > 0 ? (row.readCount / row.totalBooks) * 100 : 0;
						const active = actions.selectedReaders.includes(
							row.member.username,
						);
						return (
							<li
								key={row.member.username}
								className="flex items-center gap-3 border-border border-b py-2 last:border-b-0"
							>
								<span className="w-5 text-right text-muted-foreground text-xs tabular-nums">
									{index + 1}
								</span>
								<UserAvatar user={row.member} className="size-7" />
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<div className="flex items-baseline justify-between gap-2">
										<Link
											href={`/users/${row.member.username}` as Route}
											className="truncate font-medium text-sm hover:underline"
										>
											{row.member.name}
										</Link>
										<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
											{row.readCount} of {row.totalBooks}
										</span>
									</div>
									<div
										className="h-1.5 w-full bg-muted"
										role="img"
										aria-label={`${Math.round(share)}% of their books`}
									>
										<div
											className="h-full bg-chart-1"
											style={{ width: `${share}%` }}
										/>
									</div>
								</div>
								<button
									type="button"
									aria-pressed={active}
									onClick={() => actions.onToggleReader(row.member.username)}
									className={cn(
										"h-7 shrink-0 border px-2 text-xs transition-colors hover:bg-muted",
										active
											? "border-foreground bg-muted"
											: "border-border text-muted-foreground",
									)}
								>
									{active ? "Selected" : "Filter"}
								</button>
							</li>
						);
					})}
				</ol>
			)}
		</ChartFrame>
	);
}
