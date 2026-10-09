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

const ratingChartConfig = {
	value: { label: "Feedbacks", color: "var(--chart-1)" },
};

const growthChartConfig = {
	count: { label: "Submitted", color: "var(--chart-2)" },
};

const lengthChartConfig = {
	value: { label: "Feedbacks", color: "var(--chart-3)" },
};

const funnelChartConfig = {
	count: { label: "Feedbacks", color: "var(--chart-4)" },
};

const bookPagesChartConfig = {
	value: { label: "Feedbacks", color: "var(--chart-5)" },
};

export function AdminFeedbacksStats() {
	const { data, isPending, isError } = useQuery(
		orpc.admin.getFeedbackStats.queryOptions({
			input: {},
		}),
	);

	const feedbacksLine = useMemo(() => {
		if (!data) return [];
		return data.feedbacksByDay.map((point) => ({
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
				Could not load feedback stats.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Rating distribution</CardTitle>
						<CardDescription>Club scores across all reviews</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={ratingChartConfig} className="h-56 w-full">
							<BarChart
								data={data.ratingDistribution}
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
						<CardTitle>Submission growth</CardTitle>
						<CardDescription>
							Feedbacks submitted — last 30 days
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={growthChartConfig} className="h-56 w-full">
							<LineChart
								data={feedbacksLine}
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
						<CardTitle>Review length</CardTitle>
						<CardDescription>Character count buckets</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={lengthChartConfig} className="h-56 w-full">
							<BarChart
								data={data.reviewLengthHistogram}
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
						<CardTitle>Reviewed book length</CardTitle>
						<CardDescription>
							Page count of books members reviewed (completed catalog)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={bookPagesChartConfig}
							className="h-56 w-full"
						>
							<BarChart
								data={data.reviewedBookPagesHistogram}
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
					<CardDescription>From rating-only to social reviews</CardDescription>
				</CardHeader>
				<CardContent>
					<ChartContainer config={funnelChartConfig} className="h-64 w-full">
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
								width={140}
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
