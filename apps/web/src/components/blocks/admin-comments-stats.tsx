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
import { adminCommentContextLabels } from "@/lib/listing/admin-comments-listing";
import { orpc } from "@/utils/orpc";

const growthChartConfig = {
	count: { label: "Posted", color: "var(--chart-1)" },
};

const barChartConfig = {
	value: { label: "Comments", color: "var(--chart-2)" },
};

const funnelChartConfig = {
	count: { label: "Comments", color: "var(--chart-3)" },
};

const CONTEXT_COLORS = ["var(--chart-1)", "var(--chart-2)"];

export function AdminCommentsStats() {
	const { data, isPending, isError } = useQuery(
		orpc.admin.getCommentStats.queryOptions({
			input: {},
		}),
	);

	const commentsLine = useMemo(() => {
		if (!data) return [];
		return data.commentsByDay.map((point) => ({
			...point,
			label: new Intl.DateTimeFormat(undefined, {
				month: "short",
				day: "numeric",
			}).format(new Date(`${point.date}T12:00:00.000Z`)),
		}));
	}, [data]);

	const contextPie = useMemo(() => {
		if (!data) return [];
		return data.contextMix.map((row) => ({
			name: adminCommentContextLabels[row.context],
			value: row.count,
		}));
	}, [data]);

	if (isPending) {
		return <Skeleton className="h-160 w-full" />;
	}

	if (isError || !data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load comment stats.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Comment growth</CardTitle>
						<CardDescription>Comments posted — last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={growthChartConfig} className="h-56 w-full">
							<LineChart
								data={commentsLine}
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

				<Card size="sm">
					<CardHeader>
						<CardTitle>Context mix</CardTitle>
						<CardDescription>Posts vs feedback threads</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={barChartConfig}
							className="mx-auto h-56 w-full max-w-sm"
						>
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Pie
									data={contextPie}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={80}
								>
									{contextPie.map((entry, index) => (
										<Cell
											key={entry.name}
											fill={CONTEXT_COLORS[index % CONTEXT_COLORS.length]}
										/>
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Thread depth</CardTitle>
						<CardDescription>Reply depth distribution</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={barChartConfig} className="h-56 w-full">
							<BarChart
								data={data.depthHistogram}
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
						<CardTitle>Likes histogram</CardTitle>
						<CardDescription>Like counts per comment bucket</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={barChartConfig} className="h-56 w-full">
							<BarChart
								data={data.likesHistogram}
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
					<CardTitle>Engagement funnel</CardTitle>
					<CardDescription>
						From top-level comments to deep threads
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
	);
}
