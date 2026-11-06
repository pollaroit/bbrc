"use client";

import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { StatsEmpty } from "./stats-kit";

const CUMULATIVE_CONFIG: ChartConfig = {
	total: { label: "Total", color: "var(--chart-1)" },
};

/** A running total over time. */
export function CumulativeArea({
	points,
	label,
}: {
	points: readonly { label: string; total: number; added: number }[];
	label: string;
}) {
	if (points.length === 0 || points.every((point) => point.total === 0)) {
		return <StatsEmpty>Nothing yet in this period.</StatsEmpty>;
	}
	return (
		<ChartContainer
			config={{ total: { ...CUMULATIVE_CONFIG.total, label } }}
			className="h-52 w-full"
		>
			<AreaChart
				data={[...points]}
				margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tickMargin={6}
					minTickGap={24}
				/>
				<YAxis
					allowDecimals={false}
					tickLine={false}
					axisLine={false}
					width={32}
					tickMargin={4}
				/>
				<ChartTooltip content={<ChartTooltipContent />} />
				<Area
					type="monotone"
					dataKey="total"
					stroke="var(--color-total)"
					fill="var(--color-total)"
					fillOpacity={0.15}
					strokeWidth={2}
				/>
			</AreaChart>
		</ChartContainer>
	);
}
