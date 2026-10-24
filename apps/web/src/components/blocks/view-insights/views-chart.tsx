"use client";

import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatCount, longDay, shortDay } from "./insight-format";

export type SeriesPoint = {
	day: string;
	opens: number;
	impressions: number;
	uniqueViewers: number;
};

export type ChartMetric = "opens" | "impressions" | "uniqueViewers";

const config = {
	opens: { label: "Opens", color: "var(--chart-1)" },
	impressions: { label: "Seen in lists", color: "var(--chart-2)" },
	uniqueViewers: { label: "Viewers", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** One metric per day. Kept in its own file so recharts loads only when insights open. */
export function ViewsChart({
	series,
	metric,
}: {
	series: SeriesPoint[];
	metric: ChartMetric;
}) {
	return (
		<ChartContainer config={config} className="aspect-auto h-56 w-full sm:h-64">
			<AreaChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
				<defs>
					<linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="0%"
							stopColor={`var(--color-${metric})`}
							stopOpacity={0.45}
						/>
						<stop
							offset="100%"
							stopColor={`var(--color-${metric})`}
							stopOpacity={0.02}
						/>
					</linearGradient>
				</defs>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="day"
					tickLine={false}
					axisLine={false}
					tickFormatter={shortDay}
					interval="preserveStartEnd"
					minTickGap={36}
				/>
				<YAxis
					allowDecimals={false}
					width={32}
					tickLine={false}
					axisLine={false}
				/>
				<ChartTooltip
					content={
						<ChartTooltipContent
							labelFormatter={(_, payload) => {
								const day = payload?.[0]?.payload?.day;
								return typeof day === "string" ? longDay(day) : "";
							}}
							formatter={(value) => (
								<span className="font-medium tabular-nums">
									{formatCount(Number(value))}{" "}
									{config[metric].label.toLowerCase()}
								</span>
							)}
							hideIndicator
						/>
					}
				/>
				<Area
					type="monotone"
					dataKey={metric}
					stroke={`var(--color-${metric})`}
					strokeWidth={2}
					fill={`url(#fill-${metric})`}
					dot={false}
					isAnimationActive={false}
				/>
			</AreaChart>
		</ChartContainer>
	);
}
