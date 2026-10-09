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
import { adminPostAttachmentKindLabels } from "@/lib/listing/admin-posts-listing";
import { orpc } from "@/utils/orpc";

const growthChartConfig = {
	count: { label: "Posted", color: "var(--chart-1)" },
};

const barChartConfig = {
	value: { label: "Posts", color: "var(--chart-2)" },
};

const funnelChartConfig = {
	count: { label: "Posts", color: "var(--chart-3)" },
};

const likesChartConfig = {
	value: { label: "Posts", color: "var(--chart-4)" },
};

const KIND_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

export function AdminPostsStats() {
	const { data, isPending, isError } = useQuery(
		orpc.admin.getPostStats.queryOptions({
			input: {},
		}),
	);

	const postsLine = useMemo(() => {
		if (!data) return [];
		return data.postsByDay.map((point) => ({
			...point,
			label: new Intl.DateTimeFormat(undefined, {
				month: "short",
				day: "numeric",
			}).format(new Date(`${point.date}T12:00:00.000Z`)),
		}));
	}, [data]);

	const attachmentPie = useMemo(() => {
		if (!data) return [];
		return data.attachmentKindMix.map((row) => ({
			name: adminPostAttachmentKindLabels[row.kind],
			value: row.count,
		}));
	}, [data]);

	if (isPending) {
		return <Skeleton className="h-160 w-full" />;
	}

	if (isError || !data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load post stats.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Post growth</CardTitle>
						<CardDescription>Posts published — last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={growthChartConfig} className="h-56 w-full">
							<LineChart
								data={postsLine}
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
						<CardTitle>Attachment kinds</CardTitle>
						<CardDescription>What posts link to</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={barChartConfig}
							className="mx-auto h-56 w-full max-w-sm"
						>
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Pie
									data={attachmentPie}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={80}
								>
									{attachmentPie.map((entry, index) => (
										<Cell
											key={entry.name}
											fill={KIND_COLORS[index % KIND_COLORS.length]}
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
						<CardTitle>Content length</CardTitle>
						<CardDescription>Character count buckets</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={barChartConfig} className="h-56 w-full">
							<BarChart
								data={data.contentLengthHistogram}
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
						<CardDescription>Like counts per post bucket</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={likesChartConfig} className="h-56 w-full">
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
						From plain posts to rich attachments
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
