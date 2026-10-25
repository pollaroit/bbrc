"use client";

import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const config = {
	count: { label: "Books finished", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Books finished per month. Its own file, so recharts loads only on this page. */
export function ReadingStatsChart({
	data,
}: {
	data: { month: string; label: string; count: number }[];
}) {
	return (
		<ChartContainer config={config} className="aspect-auto h-52 w-full">
			<BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					minTickGap={12}
				/>
				<YAxis
					allowDecimals={false}
					tickLine={false}
					axisLine={false}
					width={24}
				/>
				<ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
				<Bar dataKey="count" fill="var(--color-count)" />
			</BarChart>
		</ChartContainer>
	);
}
