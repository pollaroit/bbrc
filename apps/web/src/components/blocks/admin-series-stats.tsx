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
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";
import { orpc } from "@/utils/orpc";

const growthChartConfig = {
	count: { label: "Created", color: "var(--chart-2)" },
};

const barChartConfig = {
	value: { label: "Series", color: "var(--chart-3)" },
};

const funnelChartConfig = {
	count: { label: "Series", color: "var(--chart-4)" },
};

export function AdminSeriesStats() {
	const { data, isPending, isError } = useQuery(
		orpc.admin.getSeriesStats.queryOptions({
			input: {},
		}),
	);

	const seriesLine = useMemo(() => {
		if (!data) return [];
		return data.seriesByDay.map((point) => ({
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
				Could not load series stats.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Growth</CardTitle>
						<CardDescription>Series created — last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={growthChartConfig} className="h-56 w-full">
							<LineChart data={seriesLine} margin={{ left: 0, right: 8 }}>
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

				<Card size="sm">
					<CardHeader>
						<CardTitle>Books per series</CardTitle>
						<CardDescription>How full each series tends to be</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={barChartConfig} className="h-56 w-full">
							<BarChart
								data={data.booksPerSeriesHistogram}
								margin={{ left: 0, right: 8 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									interval={0}
									fontSize={11}
								/>
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
					<CardTitle>Coverage</CardTitle>
					<CardDescription>
						From empty shells to series ready for readers
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ChartContainer config={funnelChartConfig} className="h-56 w-full">
						<BarChart
							data={data.coverageFunnel}
							layout="vertical"
							margin={{ left: 8, right: 8 }}
						>
							<CartesianGrid horizontal={false} />
							<XAxis type="number" allowDecimals={false} tickLine={false} />
							<YAxis
								type="category"
								dataKey="stage"
								width={160}
								tickLine={false}
								axisLine={false}
								fontSize={12}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey="count" fill="var(--color-count)" />
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</div>
	);
}
