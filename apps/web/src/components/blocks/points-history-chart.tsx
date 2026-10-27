"use client";

import type { GetPointsChartOutput } from "@bbrc/api/modules/rp/rp.schema";
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
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { formatDateTime } from "@/lib/format-datetime";

import { useFormatters } from "@/lib/i18n/use-formatters";

type PointsHistoryChartProps = {
	metricLabel: "RP" | "XP";
	currentTotal: number;
	points: GetPointsChartOutput["points"];
};

const chartConfig = {
	total: {
		label: "Total",
		color: "var(--chart-1)",
	},
};

export function PointsHistoryChart({
	metricLabel,
	currentTotal,
	points,
}: PointsHistoryChartProps) {
	const f = useFormatters();
	const chartData = useMemo(
		() =>
			points.map((point) => ({
				total: point.total,
				date: point.date,
				dateLabel: f.dateWith(
					typeof point.date === "string" ? new Date(point.date) : point.date,
					{
						dateStyle: "medium",
					},
				),
			})),
		[points, f],
	);

	const yDomain = useMemo((): [number, number] => {
		const totals = chartData.map((point) => point.total);
		if (totals.length === 0) {
			return [0, 1];
		}

		const min = Math.min(...totals);
		const max = Math.max(...totals);
		const span = Math.max(max - min, 1);
		const padding = span * 0.12;

		return [min - padding, max + padding];
	}, [chartData]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{metricLabel} over time</CardTitle>
				<CardDescription>
					Current total:{" "}
					<span className="font-medium text-foreground tabular-nums">
						{currentTotal} {metricLabel}
					</span>
				</CardDescription>
			</CardHeader>
			<CardContent>
				{chartData.length <= 1 ? (
					<p className="text-muted-foreground text-sm">
						No {metricLabel} events yet. The line will appear once this member
						earns {metricLabel}.
					</p>
				) : (
					<ChartContainer config={chartConfig} className="h-44 w-full sm:h-48">
						<LineChart
							data={chartData}
							margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
						>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="dateLabel"
								tickLine={false}
								axisLine={false}
								minTickGap={24}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								width={40}
								domain={yDomain}
							/>
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(_, payload) => {
											const row = payload?.[0]?.payload as
												| { date?: Date }
												| undefined;
											return row?.date ? formatDateTime(row.date) : "";
										}}
									/>
								}
							/>
							<Line
								type="monotone"
								dataKey="total"
								stroke="var(--color-total)"
								strokeWidth={2}
								dot={false}
							/>
						</LineChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
