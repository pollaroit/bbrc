"use client";

import { getBookCountryName } from "@bbrc/shared";
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
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
	XAxis,
	YAxis,
} from "recharts";
import { AdminAuthorsToolbar } from "@/components/blocks/author/admin/admin-authors-toolbar";
import {
	adminAuthorEnrichmentLabels,
	adminAuthorFieldLabels,
	adminAuthorGenderLabels,
	adminAuthorSourceLabels,
	adminAuthorStatusLabels,
	toAdminAuthorsScopeCallInput,
	useAdminAuthorsListingSearchParams,
} from "@/lib/listing/admin-authors-listing";
import { orpc } from "@/utils/orpc";

const PIE_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

const countConfig = { count: { label: "Authors", color: "var(--chart-1)" } };
const additionsConfig = {
	count: { label: "Added", color: "var(--chart-2)" },
	total: { label: "Total", color: "var(--chart-4)" },
};
const percentConfig = { percent: { label: "Filled", color: "var(--chart-3)" } };
const backlogConfig = {
	needsReview: { label: "Needs review", color: "var(--chart-5)" },
	auto: { label: "Filled in automatically", color: "var(--chart-2)" },
};
const sourceConfig = {
	openlibrary: { label: "Open Library", color: "var(--chart-1)" },
	wikidata: { label: "Wikidata", color: "var(--chart-2)" },
	wikipedia: { label: "Wikipedia", color: "var(--chart-3)" },
	ai: { label: "AI-assisted", color: "var(--chart-4)" },
	admin: { label: "Admin", color: "var(--chart-5)" },
	unknown: { label: "Unknown", color: "var(--muted-foreground)" },
};
const followerConfig = {
	total: { label: "Follows", color: "var(--chart-1)" },
};

function monthLabel(month: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		year: "2-digit",
	}).format(new Date(`${month}-01T12:00:00.000Z`));
}

function ChartCard({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{description ? <CardDescription>{description}</CardDescription> : null}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

function StatCard({ label, value }: { label: string; value: number }) {
	return (
		<Card size="sm">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">{label}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="font-medium text-2xl tabular-nums">
					{value.toLocaleString()}
				</p>
			</CardContent>
		</Card>
	);
}

export function AdminAuthorsStats() {
	const [params] = useAdminAuthorsListingSearchParams();
	const input = toAdminAuthorsScopeCallInput(params);
	const { data, isPending, isError } = useQuery(
		orpc.authorAdmin.stats.queryOptions({ input }),
	);

	const view = useMemo(() => {
		if (!data) return null;
		return {
			status: data.statusDistribution.map((row) => ({
				name: adminAuthorStatusLabels[row.status],
				value: row.count,
			})),
			enrichment: data.enrichmentDistribution.map((row) => ({
				name: adminAuthorEnrichmentLabels[row.status],
				value: row.count,
			})),
			daily: data.additionsByDay.map((point) => ({
				...point,
				label: new Intl.DateTimeFormat(undefined, {
					month: "short",
					day: "numeric",
				}).format(new Date(`${point.date}T12:00:00.000Z`)),
			})),
			monthly: data.additionsByMonth.map((row) => ({
				...row,
				label: monthLabel(row.month),
			})),
			coverage: data.coverage.map((row) => ({
				...row,
				label:
					adminAuthorFieldLabels[
						row.field as keyof typeof adminAuthorFieldLabels
					] ?? row.field,
			})),
			sourcesByField: data.sourcesByField.map((row) => ({
				...row,
				label:
					adminAuthorFieldLabels[
						row.field as keyof typeof adminAuthorFieldLabels
					] ?? row.field,
			})),
			origin: [
				{ name: "Sources", value: data.aiVersusSources.sourced },
				{ name: "AI-assisted", value: data.aiVersusSources.ai },
				{ name: "Admin", value: data.aiVersusSources.admin },
				{ name: "Unknown", value: data.aiVersusSources.unknown },
			].filter((row) => row.value > 0),
			nationalities: data.nationalities.slice(0, 12).map((row) => ({
				...row,
				label: getBookCountryName(row.alpha2) ?? row.name,
			})),
			genders: data.genders.map((row) => ({
				...row,
				label: adminAuthorGenderLabels[row.gender],
			})),
			decades: data.birthDecades.map((row) => ({
				...row,
				label: `${row.decade}s`,
			})),
			attempts: data.attemptsDistribution.map((row) => ({
				...row,
				label: `${row.attempts}`,
			})),
			enrichedPerMonth: data.enrichedPerMonth.map((row) => ({
				...row,
				label: monthLabel(row.month),
			})),
			backlog: data.reviewBacklogByMonth.map((row) => ({
				...row,
				label: monthLabel(row.month),
			})),
			followers: data.followerGrowth.map((row) => ({
				...row,
				label: monthLabel(row.month),
			})),
		};
	}, [data]);

	let body: React.ReactNode;

	if (isPending) {
		body = <Skeleton className="h-160 w-full" />;
	} else if (isError || !data || !view) {
		body = (
			<p className="text-muted-foreground text-sm">
				Could not load author stats.
			</p>
		);
	} else {
		body = (
			<div className="flex flex-col gap-6">
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
					<StatCard label="Authors" value={data.totals.authors} />
					<StatCard label="Review queue" value={data.totals.reviewQueue} />
					<StatCard
						label="Look-alike pairs"
						value={data.totals.mergeSuggestions}
					/>
					<StatCard
						label="Lookups failed"
						value={data.totals.enrichmentFailed}
					/>
					<StatCard label="Follows" value={data.totals.followers} />
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<ChartCard
						title="Status mix"
						description="Share of authors by check status"
					>
						<ChartContainer
							config={countConfig}
							className="mx-auto h-56 w-full max-w-sm"
						>
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Pie
									data={view.status}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={80}
								>
									{view.status.map((entry, index) => (
										<Cell
											key={entry.name}
											fill={PIE_COLORS[index % PIE_COLORS.length]}
										/>
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
					</ChartCard>
					<ChartCard
						title="Lookups"
						description="Where the automatic lookup stands"
					>
						<ChartContainer
							config={countConfig}
							className="mx-auto h-56 w-full max-w-sm"
						>
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Pie
									data={view.enrichment}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={80}
								>
									{view.enrichment.map((entry, index) => (
										<Cell
											key={entry.name}
											fill={PIE_COLORS[index % PIE_COLORS.length]}
										/>
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
					</ChartCard>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<ChartCard
						title="Author growth"
						description="Authors added — last 30 days"
					>
						<ChartContainer config={additionsConfig} className="h-56 w-full">
							<LineChart
								data={view.daily}
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
								<Line
									type="monotone"
									dataKey="count"
									stroke="var(--color-count)"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ChartContainer>
					</ChartCard>
					<ChartCard
						title="Authors over time"
						description="Added per month, with the running total"
					>
						<ChartContainer config={additionsConfig} className="h-56 w-full">
							<AreaChart
								data={view.monthly}
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
								<YAxis allowDecimals={false} width={32} tickLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Area
									type="monotone"
									dataKey="total"
									stroke="var(--color-total)"
									fill="var(--color-total)"
									fillOpacity={0.15}
								/>
								<Area
									type="monotone"
									dataKey="count"
									stroke="var(--color-count)"
									fill="var(--color-count)"
									fillOpacity={0.3}
								/>
							</AreaChart>
						</ChartContainer>
					</ChartCard>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<ChartCard
						title="How complete the records are"
						description="Share of authors with each field"
					>
						<ChartContainer config={percentConfig} className="h-72 w-full">
							<BarChart
								layout="vertical"
								data={view.coverage}
								margin={{ left: 8, right: 16, top: 8 }}
							>
								<CartesianGrid horizontal={false} />
								<XAxis
									type="number"
									domain={[0, 100]}
									tickLine={false}
									unit="%"
								/>
								<YAxis
									type="category"
									dataKey="label"
									width={110}
									tickLine={false}
									axisLine={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="percent" fill="var(--color-percent)" />
							</BarChart>
						</ChartContainer>
					</ChartCard>
					<ChartCard
						title="Where the values came from"
						description="Filled fields by source, per field"
					>
						<ChartContainer config={sourceConfig} className="h-72 w-full">
							<BarChart
								layout="vertical"
								data={view.sourcesByField}
								margin={{ left: 8, right: 16, top: 8 }}
							>
								<CartesianGrid horizontal={false} />
								<XAxis type="number" allowDecimals={false} tickLine={false} />
								<YAxis
									type="category"
									dataKey="label"
									width={110}
									tickLine={false}
									axisLine={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								{(
									Object.keys(
										adminAuthorSourceLabels,
									) as (keyof typeof adminAuthorSourceLabels)[]
								).map((source) => (
									<Bar
										key={source}
										dataKey={source}
										stackId="sources"
										fill={`var(--color-${source})`}
									/>
								))}
								<Bar
									dataKey="unknown"
									stackId="sources"
									fill="var(--color-unknown)"
								/>
							</BarChart>
						</ChartContainer>
					</ChartCard>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<ChartCard
						title="AI versus real sources"
						description="All filled values, by how they were found"
					>
						<ChartContainer
							config={countConfig}
							className="mx-auto h-56 w-full max-w-sm"
						>
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Pie
									data={view.origin}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={80}
								>
									{view.origin.map((entry, index) => (
										<Cell
											key={entry.name}
											fill={PIE_COLORS[index % PIE_COLORS.length]}
										/>
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
					</ChartCard>
					<ChartCard title="Nationalities" description="Top twelve">
						<ChartContainer config={countConfig} className="h-56 w-full">
							<BarChart
								layout="vertical"
								data={view.nationalities}
								margin={{ left: 8, right: 16, top: 8 }}
							>
								<CartesianGrid horizontal={false} />
								<XAxis type="number" allowDecimals={false} tickLine={false} />
								<YAxis
									type="category"
									dataKey="label"
									width={110}
									tickLine={false}
									axisLine={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-count)" />
							</BarChart>
						</ChartContainer>
					</ChartCard>
				</div>

				<div className="grid gap-4 lg:grid-cols-3">
					<ChartCard title="Gender">
						<ChartContainer config={countConfig} className="h-52 w-full">
							<BarChart
								data={view.genders}
								margin={{ left: 0, right: 8, top: 8 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="label" tickLine={false} axisLine={false} />
								<YAxis allowDecimals={false} width={28} tickLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-count)" />
							</BarChart>
						</ChartContainer>
					</ChartCard>
					<ChartCard title="Born in" description="Authors by decade of birth">
						<ChartContainer config={countConfig} className="h-52 w-full">
							<BarChart
								data={view.decades}
								margin={{ left: 0, right: 8, top: 8 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									interval="preserveStartEnd"
								/>
								<YAxis allowDecimals={false} width={28} tickLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-count)" />
							</BarChart>
						</ChartContainer>
					</ChartCard>
					<ChartCard title="Books per author">
						<ChartContainer config={countConfig} className="h-52 w-full">
							<BarChart
								data={data.booksPerAuthor}
								margin={{ left: 0, right: 8, top: 8 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="label" tickLine={false} axisLine={false} />
								<YAxis allowDecimals={false} width={28} tickLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-count)" />
							</BarChart>
						</ChartContainer>
					</ChartCard>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<ChartCard
						title="Review backlog"
						description="Authors still waiting for a check, by the month they appeared"
					>
						<ChartContainer config={backlogConfig} className="h-56 w-full">
							<BarChart
								data={view.backlog}
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
								<Bar
									dataKey="needsReview"
									stackId="backlog"
									fill="var(--color-needsReview)"
								/>
								<Bar
									dataKey="auto"
									stackId="backlog"
									fill="var(--color-auto)"
								/>
							</BarChart>
						</ChartContainer>
					</ChartCard>
					<ChartCard
						title="Lookups per month"
						description="Authors looked up, and how many tries each needed"
					>
						<div className="grid gap-4 sm:grid-cols-2">
							<ChartContainer config={countConfig} className="h-56 w-full">
								<BarChart
									data={view.enrichedPerMonth}
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
							<ChartContainer config={countConfig} className="h-56 w-full">
								<BarChart
									data={view.attempts}
									margin={{ left: 0, right: 8, top: 8 }}
								>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										label={{
											value: "Tries",
											position: "insideBottom",
											offset: -2,
										}}
									/>
									<YAxis allowDecimals={false} width={28} tickLine={false} />
									<ChartTooltip content={<ChartTooltipContent />} />
									<Bar dataKey="count" fill="var(--color-count)" />
								</BarChart>
							</ChartContainer>
						</div>
					</ChartCard>
				</div>

				<ChartCard
					title="Follower growth"
					description="Follows added per month, with the running total"
				>
					<ChartContainer config={followerConfig} className="h-56 w-full">
						<AreaChart
							data={view.followers}
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
							<YAxis allowDecimals={false} width={32} tickLine={false} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Area
								type="monotone"
								dataKey="total"
								stroke="var(--color-total)"
								fill="var(--color-total)"
								fillOpacity={0.2}
							/>
						</AreaChart>
					</ChartContainer>
				</ChartCard>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<AdminAuthorsToolbar variant="stats" />
			{body}
		</div>
	);
}
