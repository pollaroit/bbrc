"use client";

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
import { bookStatusFilterLabels } from "@/lib/listing/books-listing";
import { orpc } from "@/utils/orpc";

const statusChartConfig = {
	count: { label: "Books", color: "var(--chart-1)" },
};

const additionsChartConfig = {
	count: { label: "Added", color: "var(--chart-2)" },
};

const pagesChartConfig = {
	value: { label: "Books", color: "var(--chart-3)" },
};

const ratingChartConfig = {
	openLibrary: { label: "Open Library", color: "var(--chart-4)" },
	club: { label: "Club", color: "var(--chart-5)" },
};

const STATUS_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function AdminBooksStats() {
	const { data, isPending, isError } = useQuery(
		orpc.admin.getBookStats.queryOptions({
			input: {},
		}),
	);

	const statusPie = useMemo(() => {
		if (!data) return [];
		return data.statusDistribution.map((row) => ({
			name: bookStatusFilterLabels[row.status],
			value: row.count,
		}));
	}, [data]);

	const additionsLine = useMemo(() => {
		if (!data) return [];
		return data.additionsByDay.map((point) => ({
			...point,
			label: new Intl.DateTimeFormat(undefined, {
				month: "short",
				day: "numeric",
			}).format(new Date(`${point.date}T12:00:00.000Z`)),
		}));
	}, [data]);

	if (isPending) {
		return <Skeleton className="h-160 w-full" />;
	}

	if (isError || !data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load book stats.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Status mix</CardTitle>
						<CardDescription>Share of catalog by status</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={statusChartConfig}
							className="mx-auto h-56 w-full max-w-sm"
						>
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Pie
									data={statusPie}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={80}
								>
									{statusPie.map((entry, index) => (
										<Cell
											key={entry.name}
											fill={STATUS_COLORS[index % STATUS_COLORS.length]}
										/>
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Catalog growth</CardTitle>
						<CardDescription>Books added — last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={additionsChartConfig}
							className="h-56 w-full"
						>
							<LineChart
								data={additionsLine}
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
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Page length</CardTitle>
						<CardDescription>Distribution of page counts</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={pagesChartConfig} className="h-56 w-full">
							<BarChart
								data={data.pagesHistogram}
								margin={{ left: 0, right: 8, top: 8 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="label" tickLine={false} axisLine={false} />
								<YAxis allowDecimals={false} width={28} tickLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="value" fill="var(--color-value)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Published by decade</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={pagesChartConfig} className="h-56 w-full">
							<BarChart
								data={data.publishedByDecade}
								margin={{ left: 0, right: 8, top: 8 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="label" tickLine={false} axisLine={false} />
								<YAxis allowDecimals={false} width={28} tickLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="value" fill="var(--color-value)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>

			<Card size="sm">
				<CardHeader>
					<CardTitle>Rating buckets</CardTitle>
					<CardDescription>Open Library vs club average</CardDescription>
				</CardHeader>
				<CardContent>
					<ChartContainer config={ratingChartConfig} className="h-64 w-full">
						<BarChart
							data={data.ratingBuckets}
							margin={{ left: 0, right: 8, top: 8 }}
						>
							<CartesianGrid vertical={false} />
							<XAxis dataKey="bucket" tickLine={false} axisLine={false} />
							<YAxis allowDecimals={false} width={28} tickLine={false} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey="openLibrary" fill="var(--color-openLibrary)" />
							<Bar dataKey="club" fill="var(--color-club)" />
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Engagement funnel</CardTitle>
						<CardDescription>Unique books at each stage</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={pagesChartConfig} className="h-56 w-full">
							<BarChart
								layout="vertical"
								data={data.engagementFunnel}
								margin={{ left: 8, right: 8, top: 8 }}
							>
								<CartesianGrid horizontal={false} />
								<XAxis type="number" allowDecimals={false} tickLine={false} />
								<YAxis
									type="category"
									dataKey="stage"
									width={100}
									tickLine={false}
									axisLine={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-value)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Sitting involvement</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={pagesChartConfig} className="h-56 w-full">
							<BarChart
								data={data.sittingInvolvement}
								margin={{ left: 0, right: 8, top: 8 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="kind" tickLine={false} axisLine={false} />
								<YAxis allowDecimals={false} width={28} tickLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-value)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
