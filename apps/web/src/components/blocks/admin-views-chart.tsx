"use client";

import type { AdminViewsOverview } from "@bbrc/api/modules/view/view.schema";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const config = {
	opens: { label: "Opens", color: "var(--chart-1)" },
	impressions: { label: "Seen in lists", color: "var(--chart-2)" },
	uniqueViewers: { label: "Unique viewers", color: "var(--chart-3)" },
};

const dayLabel = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	timeZone: "UTC",
});

/** Daily opens, list impressions and unique viewers. Loaded on demand (recharts is heavy). */
export default function AdminViewsChart({
	series,
	className = "h-64 w-full",
}: {
	series: AdminViewsOverview["series"];
	className?: string;
}) {
	const data = useMemo(
		() =>
			series.map((point) => ({
				...point,
				label: dayLabel.format(new Date(`${point.day}T00:00:00Z`)),
			})),
		[series],
	);

	return (
		<ChartContainer config={config} className={className}>
			<LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					interval="preserveStartEnd"
					minTickGap={28}
				/>
				<YAxis allowDecimals={false} width={32} tickLine={false} />
				<ChartTooltip content={<ChartTooltipContent />} />
				<ChartLegend content={<ChartLegendContent />} />
				<Line
					type="monotone"
					dataKey="opens"
					stroke="var(--color-opens)"
					strokeWidth={2}
					dot={false}
				/>
				<Line
					type="monotone"
					dataKey="impressions"
					stroke="var(--color-impressions)"
					strokeWidth={2}
					dot={false}
				/>
				<Line
					type="monotone"
					dataKey="uniqueViewers"
					stroke="var(--color-uniqueViewers)"
					strokeWidth={2}
					strokeDasharray="4 3"
					dot={false}
				/>
			</LineChart>
		</ChartContainer>
	);
}
