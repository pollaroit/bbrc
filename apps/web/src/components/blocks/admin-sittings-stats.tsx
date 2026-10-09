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
import { sittingStatusFilterLabels } from "@/lib/listing/sittings-listing";
import { orpc } from "@/utils/orpc";

const statusChartConfig = {
	count: { label: "Sittings", color: "var(--chart-1)" },
};

const growthChartConfig = {
	count: { label: "Started", color: "var(--chart-2)" },
};

const barChartConfig = {
	value: { label: "Sittings", color: "var(--chart-3)" },
};

const funnelChartConfig = {
	count: { label: "Sittings", color: "var(--chart-4)" },
};

const STATUS_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function AdminSittingsStats() {
	const { data, isPending, isError } = useQuery(
		orpc.admin.getSittingStats.queryOptions({
			input: {},
		}),
	);

	const statusPie = useMemo(() => {
		if (!data) return [];
		return data.statusDistribution.map((row) => ({
			name: sittingStatusFilterLabels[row.status],
			value: row.count,
		}));
	}, [data]);

	const sittingsLine = useMemo(() => {
		if (!data) return [];
		return data.sittingsByDay.map((point) => ({
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
				Could not load sitting stats.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Status mix</CardTitle>
						<CardDescription>Share of sittings by phase</CardDescription>
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
						<CardTitle>Sitting growth</CardTitle>
						<CardDescription>Sittings started — last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={growthChartConfig} className="h-56 w-full">
							<LineChart
								data={sittingsLine}
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
						<CardTitle>Participation mix</CardTitle>
						<CardDescription>Reader outcomes across sittings</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={barChartConfig} className="h-56 w-full">
							<BarChart
								data={data.participationMix}
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
						<CardTitle>Poll vote histogram</CardTitle>
						<CardDescription>Total votes per sitting bucket</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={barChartConfig} className="h-56 w-full">
							<BarChart
								data={data.pollVoteHistogram}
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

			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Selected book pages</CardTitle>
						<CardDescription>Page count of picked titles</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={barChartConfig} className="h-56 w-full">
							<BarChart
								data={data.selectedBookPagesHistogram}
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
						<CardDescription>From start to finished reads</CardDescription>
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
