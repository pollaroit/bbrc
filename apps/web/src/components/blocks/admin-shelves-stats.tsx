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
import {
	adminShelfStatusFilterLabels,
	shelfTypeFilterLabels,
} from "@/lib/listing/admin-shelves-listing";
import { orpc } from "@/utils/orpc";

const statusChartConfig = {
	count: { label: "Shelves", color: "var(--chart-1)" },
};

const growthChartConfig = {
	count: { label: "Created", color: "var(--chart-2)" },
};

const barChartConfig = {
	value: { label: "Shelves", color: "var(--chart-3)" },
};

const funnelChartConfig = {
	count: { label: "Shelves", color: "var(--chart-4)" },
};

const STATUS_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function AdminShelvesStats() {
	const { data, isPending, isError } = useQuery(
		orpc.admin.getShelfStats.queryOptions({
			input: {},
		}),
	);

	const statusPie = useMemo(() => {
		if (!data) return [];
		return data.statusDistribution.map((row) => ({
			name: adminShelfStatusFilterLabels[row.status],
			value: row.count,
		}));
	}, [data]);

	const typePie = useMemo(() => {
		if (!data) return [];
		return data.typeDistribution.map((row) => ({
			name: shelfTypeFilterLabels[row.type],
			value: row.count,
		}));
	}, [data]);

	const shelvesLine = useMemo(() => {
		if (!data) return [];
		return data.shelvesByDay.map((point) => ({
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
				Could not load shelf stats.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Status mix</CardTitle>
						<CardDescription>Visibility across all shelves</CardDescription>
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
						<CardTitle>List type mix</CardTitle>
						<CardDescription>Ranked vs simple shelves</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={statusChartConfig}
							className="mx-auto h-56 w-full max-w-sm"
						>
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Pie
									data={typePie}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={80}
								>
									{typePie.map((entry, index) => (
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
			</div>

			<Card size="sm">
				<CardHeader>
					<CardTitle>Shelf growth</CardTitle>
					<CardDescription>Shelves created — last 30 days</CardDescription>
				</CardHeader>
				<CardContent>
					<ChartContainer config={growthChartConfig} className="h-56 w-full">
						<LineChart
							data={shelvesLine}
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

			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Books per shelf</CardTitle>
						<CardDescription>How full shelves tend to be</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={barChartConfig} className="h-56 w-full">
							<BarChart
								data={data.booksPerShelfHistogram}
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
						<CardTitle>Engagement funnel</CardTitle>
						<CardDescription>
							From empty shelves to social posts
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={funnelChartConfig} className="h-56 w-full">
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
									width={120}
									tickLine={false}
									axisLine={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-count)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
