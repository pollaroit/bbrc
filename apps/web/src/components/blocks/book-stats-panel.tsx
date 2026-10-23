"use client";

import type { GetBookStatsOutput } from "@bbrc/api/modules/book/book-stats.schema";
import { formatFeedbackRating } from "@bbrc/shared";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import { Label } from "@bbrc/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@bbrc/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { type ReactNode, useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";
import { orpc } from "@/utils/orpc";

type BookStats = GetBookStatsOutput;

type BookStatsPanelProps = {
	bookSlug: string;
	initialData: BookStats;
};

const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function monthLabel(row: { year: number; month: number }): string {
	return `${MONTH_NAMES[row.month - 1]} ’${String(row.year).slice(-2)}`;
}

function formatMonth(row: { year: number; month: number } | null): string {
	return row ? `${MONTH_NAMES[row.month - 1]} ${row.year}` : "—";
}

function formatAverage(value: number | null): string {
	return value == null ? "—" : value.toFixed(2);
}

function plural(count: number, one: string, many = `${one}s`): string {
	return `${count} ${count === 1 ? one : many}`;
}

function StatCard({
	label,
	value,
	hint,
}: {
	label: string;
	value: ReactNode;
	hint?: ReactNode;
}) {
	return (
		<Card size="sm" className="border-border bg-muted/5">
			<CardHeader className="pb-2">
				<CardDescription>{label}</CardDescription>
				<CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
				{hint ? (
					<p className="text-muted-foreground text-xs leading-relaxed">
						{hint}
					</p>
				) : null}
			</CardHeader>
		</Card>
	);
}

function ChartCard({
	title,
	description,
	action,
	children,
}: {
	title: string;
	description?: ReactNode;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<Card size="sm">
			<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<CardTitle>{title}</CardTitle>
					{description ? (
						<CardDescription>{description}</CardDescription>
					) : null}
				</div>
				{action}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

function NoData({ children }: { children: ReactNode }) {
	return (
		<p className="py-10 text-center text-muted-foreground text-sm">
			{children}
		</p>
	);
}

const readsConfig = {
	dated: { label: "With finish date", color: "var(--chart-2)" },
	undated: { label: "Without finish date", color: "var(--chart-1)" },
	total: { label: "Reads", color: "var(--chart-2)" },
};

const ratingLineConfig = {
	average: { label: "Average rating", color: "var(--chart-2)" },
};

const countConfig = {
	count: { label: "Ratings", color: "var(--chart-2)" },
};

const audienceConfig = {
	read: { label: "Read", color: "var(--chart-2)" },
	readingNow: { label: "Reading now", color: "var(--chart-1)" },
	notRead: { label: "Not read", color: "var(--chart-5)" },
};

const collectionsConfig = {
	favorites: { label: "Favorites", color: "var(--chart-2)" },
	shelves: { label: "On shelves", color: "var(--chart-4)" },
};

const quizQuestionConfig = {
	correct: { label: "Correct", color: "var(--chart-2)" },
	wrong: { label: "Wrong", color: "var(--chart-5)" },
	skipped: { label: "Skipped", color: "var(--chart-1)" },
};

const ratingComparisonConfig = {
	value: { label: "Rating", color: "var(--chart-2)" },
};

const BY_OPTIONS = ["year", "month"] as const;

export function BookStatsPanel({ bookSlug, initialData }: BookStatsPanelProps) {
	const { data = initialData } = useQuery({
		...orpc.book.getStats.queryOptions({ input: { bookSlug } }),
		initialData,
		staleTime: 60_000,
	});

	const [view, setView] = useQueryStates({
		by: parseAsStringLiteral(BY_OPTIONS).withDefault("year"),
		year: parseAsInteger,
	});
	const [includeUndated, setIncludeUndated] = useState(true);

	const isEmpty =
		data.totals.readers === 0 &&
		data.totals.reviews === 0 &&
		data.polls.appearances === 0;

	const readYears = useMemo(
		() =>
			[...new Set(data.reads.monthly.map((row) => row.year))].sort(
				(a, b) => b - a,
			),
		[data.reads.monthly],
	);
	const selectedYear =
		view.year != null && readYears.includes(view.year)
			? view.year
			: (readYears[0] ?? new Date().getFullYear());

	const readsCumulative = useMemo(() => {
		let datedTotal = 0;
		let undatedTotal = 0;
		return data.reads.monthly.map((row) => {
			datedTotal += row.dated;
			undatedTotal += row.undated;
			return {
				label: monthLabel(row),
				total: includeUndated ? datedTotal + undatedTotal : datedTotal,
			};
		});
	}, [data.reads.monthly, includeUndated]);

	const readsByPeriod = useMemo(() => {
		if (view.by === "year") {
			const byYear = new Map<number, { dated: number; undated: number }>();
			for (const row of data.reads.monthly) {
				const entry = byYear.get(row.year) ?? { dated: 0, undated: 0 };
				entry.dated += row.dated;
				entry.undated += row.undated;
				byYear.set(row.year, entry);
			}
			return [...byYear.entries()]
				.sort((a, b) => a[0] - b[0])
				.map(([year, entry]) => ({
					label: String(year),
					dated: entry.dated,
					undated: includeUndated ? entry.undated : 0,
				}));
		}
		return MONTH_NAMES.map((name, index) => {
			const row = data.reads.monthly.find(
				(item) => item.year === selectedYear && item.month === index + 1,
			);
			return {
				label: name,
				dated: row?.dated ?? 0,
				undated: includeUndated ? (row?.undated ?? 0) : 0,
			};
		});
	}, [data.reads.monthly, view.by, selectedYear, includeUndated]);

	const ratingHistogram = useMemo(
		() =>
			data.ratings.histogram
				.filter((row) => row.step > 0 || row.count > 0)
				.map((row) => ({
					label: formatFeedbackRating(row.step),
					count: row.count,
				})),
		[data.ratings.histogram],
	);

	const ratingSeries = useMemo(
		() =>
			data.ratings.monthly.map((row) => ({
				label: monthLabel(row),
				average: row.average,
				ratings: row.cumulativeCount,
			})),
		[data.ratings.monthly],
	);

	const ratingComparison = [
		{ label: "Club", value: data.totals.clubRating },
		{ label: "Open Library", value: data.book.openLibraryRating },
		{ label: "Library average", value: data.totals.libraryAverageRating },
	].filter((row) => row.value != null);

	const audienceSlices = [
		{ key: "read", value: data.audience.read },
		{ key: "readingNow", value: data.audience.readingNow },
		{ key: "notRead", value: data.audience.notRead },
	] as const;

	const pollBars = data.polls.entries.map((entry) => ({
		label: new Intl.DateTimeFormat("en", {
			month: "short",
			year: "2-digit",
			timeZone: "UTC",
		}).format(new Date(entry.date)),
		rank: entry.rank,
		points: entry.points,
		optionCount: entry.optionCount,
		chosen: entry.chosen,
	}));

	const funnel = [
		{ label: "Joined", count: data.sittings.joined },
		{ label: "Started", count: data.sittings.started },
		{ label: "Finished", count: data.sittings.completed },
		{ label: "Did not finish", count: data.sittings.dnf },
	];

	const clubDelta =
		data.totals.clubRating != null && data.totals.libraryAverageRating != null
			? data.totals.clubRating - data.totals.libraryAverageRating
			: null;

	if (isEmpty) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>No stats yet</EmptyTitle>
					<EmptyDescription>
						Stats appear once members read, review or vote on this book.{" "}
						<Link
							href={`/books/${bookSlug}` as Route}
							className="text-foreground underline"
						>
							Mark it as read
						</Link>{" "}
						to get them started.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
				Numbers cover members with a visible profile. Not every reader sets a
				finish month, so reads without one are counted separately and placed by
				the month they were marked as read.
			</p>

			<section
				aria-label="Totals"
				className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
			>
				<StatCard
					label="Readers"
					value={data.totals.readers}
					hint={
						data.reads.undated > 0
							? `${data.reads.dated} with a finish date, ${data.reads.undated} without`
							: data.reads.firstFinish
								? `First finished ${formatMonth(data.reads.firstFinish)}`
								: undefined
					}
				/>
				<StatCard
					label="Reviews"
					value={data.totals.reviews}
					hint={
						data.totals.reviews > 0
							? `${data.ratings.withText} with text · ${data.ratings.spoilers} marked spoiler`
							: undefined
					}
				/>
				{data.totals.clubRating != null ? (
					<StatCard
						label="Club rating"
						value={formatAverage(data.totals.clubRating)}
						hint={
							clubDelta != null
								? `${clubDelta >= 0 ? "+" : "−"}${Math.abs(clubDelta).toFixed(2)} vs library average`
								: undefined
						}
					/>
				) : null}
				{data.book.openLibraryRating != null ? (
					<StatCard
						label="Open Library rating"
						value={formatAverage(data.book.openLibraryRating)}
					/>
				) : null}
				{data.polls.appearances > 0 ? (
					<StatCard
						label="Poll appearances"
						value={data.polls.appearances}
						hint={
							data.polls.closed > 0
								? `Average rank ${formatAverage(data.polls.averageRank)} · average ${formatAverage(data.polls.averagePoints)} points · chosen ${plural(data.polls.chosen, "time")}`
								: "In a poll right now"
						}
					/>
				) : null}
				{data.totals.shelves > 0 ? (
					<StatCard label="On shelves" value={data.totals.shelves} />
				) : null}
				{data.totals.favorites > 0 ? (
					<StatCard label="Favorites" value={data.totals.favorites} />
				) : null}
				{data.totals.quizTakers > 0 ? (
					<StatCard
						label="Quiz takers"
						value={data.totals.quizTakers}
						hint={`Average score ${formatAverage(data.totals.quizAverageScore)} of ${data.quiz?.maxScore ?? 0}`}
					/>
				) : null}
				{data.totals.pagesReadTogether > 0 ? (
					<StatCard
						label="Pages read together"
						value={data.totals.pagesReadTogether.toLocaleString("en")}
						hint={`${data.book.pages} pages × ${plural(data.totals.readers, "reader")}`}
					/>
				) : null}
			</section>

			{data.reads.undated > 0 ? (
				<div className="flex items-center gap-2">
					<Checkbox
						id="book-stats-undated"
						checked={includeUndated}
						onCheckedChange={(checked) => setIncludeUndated(checked === true)}
					/>
					<Label htmlFor="book-stats-undated" className="text-sm">
						Include {plural(data.reads.undated, "read")} without a finish date
					</Label>
				</div>
			) : null}

			<div className="grid gap-6 lg:grid-cols-2">
				<ChartCard
					title="Reads over time"
					description={
						data.reads.monthly.length > 0
							? `Running total of readers, ${formatMonth(data.reads.firstFinish)} onward`
							: undefined
					}
				>
					{readsCumulative.length > 0 ? (
						<ChartContainer config={readsConfig} className="h-64 w-full">
							<LineChart
								data={readsCumulative}
								margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									interval="preserveStartEnd"
									minTickGap={24}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									width={32}
									allowDecimals={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Line
									type="stepAfter"
									dataKey="total"
									stroke="var(--color-total)"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ChartContainer>
					) : (
						<NoData>No reads yet.</NoData>
					)}
				</ChartCard>

				<ChartCard
					title={`Reads by ${view.by}`}
					description={
						view.by === "month" ? `Months of ${selectedYear}` : "Every year"
					}
					action={
						<div className="flex gap-2">
							<Select
								value={view.by}
								onValueChange={(value) =>
									void setView({ by: value as (typeof BY_OPTIONS)[number] })
								}
							>
								<SelectTrigger className="h-8 w-[100px]">
									<span>{view.by === "year" ? "Year" : "Month"}</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="year">Year</SelectItem>
									<SelectItem value="month">Month</SelectItem>
								</SelectContent>
							</Select>
							{view.by === "month" && readYears.length > 0 ? (
								<Select
									value={String(selectedYear)}
									onValueChange={(value) =>
										void setView({ year: Number(value) })
									}
								>
									<SelectTrigger className="h-8 w-[88px]">
										<span>{selectedYear}</span>
									</SelectTrigger>
									<SelectContent>
										{readYears.map((year) => (
											<SelectItem key={year} value={String(year)}>
												{year}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : null}
						</div>
					}
				>
					{data.reads.monthly.length > 0 ? (
						<ChartContainer config={readsConfig} className="h-64 w-full">
							<BarChart
								data={readsByPeriod}
								margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="label" tickLine={false} axisLine={false} />
								<YAxis
									tickLine={false}
									axisLine={false}
									width={32}
									allowDecimals={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<ChartLegend content={<ChartLegendContent />} />
								<Bar
									dataKey="dated"
									stackId="reads"
									fill="var(--color-dated)"
								/>
								{includeUndated ? (
									<Bar
										dataKey="undated"
										stackId="reads"
										fill="var(--color-undated)"
									/>
								) : null}
							</BarChart>
						</ChartContainer>
					) : (
						<NoData>No reads yet.</NoData>
					)}
				</ChartCard>

				<ChartCard
					title="Average rating over time"
					description="Running average of every rating given so far"
				>
					{ratingSeries.length > 0 ? (
						<ChartContainer config={ratingLineConfig} className="h-64 w-full">
							<LineChart
								data={ratingSeries}
								margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									interval="preserveStartEnd"
									minTickGap={24}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									width={32}
									domain={[0, 5]}
									ticks={[0, 1, 2, 3, 4, 5]}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Line
									type="monotone"
									dataKey="average"
									stroke="var(--color-average)"
									strokeWidth={2}
									dot={ratingSeries.length < 12}
								/>
							</LineChart>
						</ChartContainer>
					) : (
						<NoData>No ratings yet.</NoData>
					)}
				</ChartCard>

				<ChartCard
					title="Ratings by star"
					description={
						data.ratings.average != null
							? `Average ${formatAverage(data.ratings.average)} · median ${formatAverage(data.ratings.median)}`
							: undefined
					}
				>
					{data.totals.reviews > 0 ? (
						<ChartContainer config={countConfig} className="h-64 w-full">
							<BarChart
								data={ratingHistogram}
								margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="label" tickLine={false} axisLine={false} />
								<YAxis
									tickLine={false}
									axisLine={false}
									width={32}
									allowDecimals={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-count)" />
							</BarChart>
						</ChartContainer>
					) : (
						<NoData>No ratings yet.</NoData>
					)}
				</ChartCard>

				{ratingComparison.length > 1 ? (
					<ChartCard
						title="Club vs Open Library"
						description="Out of 5, next to the average of every book in the library"
					>
						<ChartContainer
							config={ratingComparisonConfig}
							className="h-56 w-full"
						>
							<BarChart
								data={ratingComparison}
								layout="vertical"
								margin={{ left: 8, right: 16, top: 8, bottom: 0 }}
							>
								<CartesianGrid horizontal={false} />
								<XAxis
									type="number"
									domain={[0, 5]}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									type="category"
									dataKey="label"
									tickLine={false}
									axisLine={false}
									width={104}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="value" fill="var(--color-value)" />
							</BarChart>
						</ChartContainer>
					</ChartCard>
				) : null}

				<ChartCard
					title="Members who read it"
					description={`${plural(data.audience.members, "member")} in total`}
				>
					{data.audience.members > 0 ? (
						<ChartContainer config={audienceConfig} className="h-64 w-full">
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Pie
									data={audienceSlices.map((slice) => ({
										name: slice.key,
										value: slice.value,
										fill: `var(--color-${slice.key})`,
									}))}
									dataKey="value"
									nameKey="name"
									innerRadius={56}
									outerRadius={92}
									strokeWidth={1}
								>
									{audienceSlices.map((slice) => (
										<Cell key={slice.key} fill={`var(--color-${slice.key})`} />
									))}
								</Pie>
								<ChartLegend content={<ChartLegendContent nameKey="name" />} />
							</PieChart>
						</ChartContainer>
					) : (
						<NoData>No members yet.</NoData>
					)}
				</ChartCard>

				{pollBars.length > 0 ? (
					<ChartCard
						title="Poll results"
						description={`Place in each poll, lower is better. Highlighted when the club picked it. ${data.polls.openNowSittingSlug ? "It is in an open poll now; results show once voting ends." : ""}`}
					>
						<ChartContainer config={countConfig} className="h-64 w-full">
							<BarChart
								data={pollBars}
								margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="label" tickLine={false} axisLine={false} />
								<YAxis
									tickLine={false}
									axisLine={false}
									width={32}
									allowDecimals={false}
									domain={[0, "dataMax"]}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											formatter={(_value, _name, item) => {
												const row = item.payload as (typeof pollBars)[number];
												return (
													<span>
														Place {row.rank} of {row.optionCount} ·{" "}
														{plural(row.points, "point")}
														{row.chosen ? " · picked" : ""}
													</span>
												);
											}}
										/>
									}
								/>
								<Bar dataKey="rank">
									{pollBars.map((row) => (
										<Cell
											key={row.label + row.rank}
											fill={row.chosen ? "var(--chart-2)" : "var(--chart-1)"}
										/>
									))}
								</Bar>
							</BarChart>
						</ChartContainer>
					</ChartCard>
				) : data.polls.openNowSittingSlug ? (
					<ChartCard title="Poll results">
						<NoData>
							It is in an open poll now. Results show once voting ends.
						</NoData>
					</ChartCard>
				) : null}

				{data.collections.monthly.length > 0 ? (
					<ChartCard
						title="Shelves and favorites"
						description="Running total of members who added it"
					>
						<ChartContainer config={collectionsConfig} className="h-64 w-full">
							<LineChart
								data={data.collections.monthly.map((row) => ({
									...row,
									label: monthLabel(row),
								}))}
								margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									interval="preserveStartEnd"
									minTickGap={24}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									width={32}
									allowDecimals={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<ChartLegend content={<ChartLegendContent />} />
								<Line
									type="stepAfter"
									dataKey="shelves"
									stroke="var(--color-shelves)"
									strokeWidth={2}
									dot={false}
								/>
								<Line
									type="stepAfter"
									dataKey="favorites"
									stroke="var(--color-favorites)"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ChartContainer>
					</ChartCard>
				) : null}

				{data.sittings.count > 0 ? (
					<>
						<ChartCard
							title="Sitting outcomes"
							description={`Across ${plural(data.sittings.count, "sitting")} that read this book`}
						>
							<ChartContainer config={countConfig} className="h-56 w-full">
								<BarChart
									data={funnel}
									layout="vertical"
									margin={{ left: 8, right: 16, top: 8, bottom: 0 }}
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
										tickLine={false}
										axisLine={false}
										width={104}
									/>
									<ChartTooltip content={<ChartTooltipContent />} />
									<Bar dataKey="count" fill="var(--color-count)" />
								</BarChart>
							</ChartContainer>
						</ChartCard>

						<ChartCard
							title="Time to finish"
							description={
								data.sittings.medianFinishDays != null
									? `Median ${data.sittings.medianFinishDays} days from the sitting start (approximate)`
									: "Days from the sitting start (approximate)"
							}
						>
							{data.sittings.completed > 0 ? (
								<ChartContainer config={countConfig} className="h-56 w-full">
									<BarChart
										data={data.sittings.finishDays}
										margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
									>
										<CartesianGrid vertical={false} />
										<XAxis
											dataKey="label"
											tickLine={false}
											axisLine={false}
											interval={0}
											tick={{ fontSize: 11 }}
										/>
										<YAxis
											tickLine={false}
											axisLine={false}
											width={32}
											allowDecimals={false}
										/>
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar dataKey="count" fill="var(--color-count)" />
									</BarChart>
								</ChartContainer>
							) : (
								<NoData>Nobody has finished it in a sitting yet.</NoData>
							)}
						</ChartCard>
					</>
				) : null}

				{data.quiz && data.quiz.takers > 0 ? (
					<>
						<ChartCard
							title="Quiz scores"
							description={`Scores run from ${data.quiz.minScore} to ${data.quiz.maxScore} · average ${formatAverage(data.quiz.averageScore)}`}
						>
							<ChartContainer config={countConfig} className="h-56 w-full">
								<BarChart
									data={data.quiz.scores}
									margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
								>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										interval="preserveStartEnd"
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										width={32}
										allowDecimals={false}
									/>
									<ChartTooltip content={<ChartTooltipContent />} />
									<Bar dataKey="count" fill="var(--color-count)" />
								</BarChart>
							</ChartContainer>
						</ChartCard>

						<ChartCard
							title="Quiz questions"
							description="How members answered each difficulty level"
						>
							<ChartContainer
								config={quizQuestionConfig}
								className="h-56 w-full"
							>
								<BarChart
									data={data.quiz.questions}
									margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
								>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										interval={0}
										tick={{ fontSize: 11 }}
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										width={32}
										allowDecimals={false}
									/>
									<ChartTooltip content={<ChartTooltipContent />} />
									<ChartLegend content={<ChartLegendContent />} />
									<Bar
										dataKey="correct"
										stackId="answers"
										fill="var(--color-correct)"
									/>
									<Bar
										dataKey="wrong"
										stackId="answers"
										fill="var(--color-wrong)"
									/>
									<Bar
										dataKey="skipped"
										stackId="answers"
										fill="var(--color-skipped)"
									/>
								</BarChart>
							</ChartContainer>
						</ChartCard>
					</>
				) : null}
			</div>

			{data.totals.reviews > 0 || data.reads.editions.length > 0 ? (
				<div className="grid gap-6 lg:grid-cols-2">
					{data.totals.reviews > 0 ? (
						<ChartCard
							title="Review activity"
							description={`${plural(data.ratings.likes, "like")} and ${plural(data.ratings.comments, "comment")} across ${plural(data.totals.reviews, "review")}`}
						>
							{data.ratings.topReview ? (
								<p className="text-sm leading-relaxed">
									Most talked about:{" "}
									<Link
										href={
											`/books/${bookSlug}/feedbacks/${data.ratings.topReview.slug}` as Route
										}
										className="underline"
									>
										{data.ratings.topReview.author.name}’s review
									</Link>{" "}
									with {formatFeedbackRating(data.ratings.topReview.rating)}{" "}
									stars, {plural(data.ratings.topReview.likes, "like")} and{" "}
									{plural(data.ratings.topReview.comments, "comment")}.
								</p>
							) : (
								<p className="text-muted-foreground text-sm">
									No likes or comments on reviews yet.
								</p>
							)}
						</ChartCard>
					) : null}

					{data.reads.editions.length > 0 ? (
						<ChartCard
							title="Editions read"
							description="Editions members picked when they marked it as read"
						>
							<ul className="space-y-1 text-sm">
								{data.reads.editions.map((edition) => (
									<li
										key={edition.olid}
										className="flex items-center justify-between gap-3"
									>
										<a
											href={`https://openlibrary.org/books/${edition.olid}`}
											target="_blank"
											rel="noreferrer"
											className="underline"
										>
											{edition.olid}
										</a>
										<span className="text-muted-foreground tabular-nums">
											{plural(edition.count, "read")}
										</span>
									</li>
								))}
							</ul>
						</ChartCard>
					) : null}
				</div>
			) : null}
		</div>
	);
}
