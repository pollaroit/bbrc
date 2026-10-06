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
import { userStatusFilterLabels } from "@/lib/listing/users-listing";
import { orpc } from "@/utils/orpc";

const statusChartConfig = {
	count: { label: "Members", color: "var(--chart-1)" },
};

const signupsChartConfig = {
	count: { label: "Signups", color: "var(--chart-2)" },
};

const xpChartConfig = {
	value: { label: "Members", color: "var(--chart-3)" },
};

const rpChartConfig = {
	value: { label: "Members", color: "var(--chart-4)" },
};

const activityChartConfig = {
	count: { label: "Total", color: "var(--chart-5)" },
};

const funnelChartConfig = {
	count: { label: "Members", color: "var(--chart-1)" },
};

const STATUS_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function AdminUsersStats() {
	const { data, isPending, isError, error } = useQuery(
		orpc.admin.getUserStats.queryOptions({ input: {} }),
	);

	const statusPie = useMemo(() => {
		if (!data) return [];
		return data.statusDistribution.map((row) => ({
			name: userStatusFilterLabels[row.status],
			value: row.count,
		}));
	}, [data]);

	const signupsLine = useMemo(() => {
		if (!data) return [];
		return data.signupsByDay.map((point) => ({
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
				{error?.message ?? "Could not load member stats."}
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Status mix</CardTitle>
						<CardDescription>Active, warned, and banned</CardDescription>
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
						<CardTitle>Role split</CardTitle>
						<CardDescription>Admins vs regular members</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={activityChartConfig}
							className="h-56 w-full"
						>
							<BarChart
								data={data.roleSplit}
								layout="vertical"
								margin={{ left: 8, right: 8 }}
							>
								<CartesianGrid horizontal={false} />
								<XAxis type="number" allowDecimals={false} />
								<YAxis
									type="category"
									dataKey="kind"
									width={72}
									tickLine={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-count)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>

			<Card size="sm">
				<CardHeader>
					<CardTitle>Signups</CardTitle>
					<CardDescription>New members — last 30 days</CardDescription>
				</CardHeader>
				<CardContent>
					<ChartContainer config={signupsChartConfig} className="h-56 w-full">
						<LineChart
							data={signupsLine}
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
						<CardTitle>XP distribution</CardTitle>
						<CardDescription>Members by experience points</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={xpChartConfig} className="h-56 w-full">
							<BarChart data={data.xpHistogram}>
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
						<CardTitle>RP distribution</CardTitle>
						<CardDescription>Members by reading points</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={rpChartConfig} className="h-56 w-full">
							<BarChart data={data.rpHistogram}>
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
						<CardTitle>Engagement funnel</CardTitle>
						<CardDescription>How many members reach each stage</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={funnelChartConfig} className="h-64 w-full">
							<BarChart
								data={data.engagementFunnel}
								layout="vertical"
								margin={{ left: 8, right: 8 }}
							>
								<CartesianGrid horizontal={false} />
								<XAxis type="number" allowDecimals={false} />
								<YAxis
									type="category"
									dataKey="stage"
									width={112}
									tickLine={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-count)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Club activity totals</CardTitle>
						<CardDescription>
							Sum of actions across filtered members
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={activityChartConfig}
							className="h-64 w-full"
						>
							<BarChart data={data.activityTotals}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="kind" tickLine={false} axisLine={false} />
								<YAxis allowDecimals={false} width={36} tickLine={false} />
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
