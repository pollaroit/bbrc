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
import {
	adminDocumentStatusLabels,
	DOCUMENT_LANGUAGE_LABELS,
} from "@/lib/listing/admin-documents-listing";
import { orpc } from "@/utils/orpc";

const growthChartConfig = {
	count: { label: "Submitted", color: "var(--chart-1)" },
};

const barChartConfig = {
	value: { label: "Documents", color: "var(--chart-2)" },
};

const funnelChartConfig = {
	count: { label: "Documents", color: "var(--chart-3)" },
};

const STATUS_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-4)"];

export function AdminDocumentsStats() {
	const { data, isPending, isError } = useQuery(
		orpc.admin.getDocumentStats.queryOptions({
			input: {},
		}),
	);

	const documentsLine = useMemo(() => {
		if (!data) return [];
		return data.documentsByDay.map((point) => ({
			...point,
			label: new Intl.DateTimeFormat(undefined, {
				month: "short",
				day: "numeric",
			}).format(new Date(`${point.date}T12:00:00.000Z`)),
		}));
	}, [data]);

	const statusPie = useMemo(() => {
		if (!data) return [];
		return data.statusDistribution.map((row) => ({
			name: adminDocumentStatusLabels[row.status],
			value: row.count,
		}));
	}, [data]);

	const languageBar = useMemo(() => {
		if (!data) return [];
		return data.languageMix.map((row) => ({
			label: DOCUMENT_LANGUAGE_LABELS[row.language],
			value: row.count,
		}));
	}, [data]);

	if (isPending) {
		return <Skeleton className="h-160 w-full" />;
	}

	if (isError || !data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load document stats.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Submission growth</CardTitle>
						<CardDescription>
							Documents submitted — last 30 days
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={growthChartConfig} className="h-56 w-full">
							<LineChart
								data={documentsLine}
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
						<CardTitle>Status distribution</CardTitle>
						<CardDescription>Pending, approved, and rejected</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={barChartConfig}
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
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Language mix</CardTitle>
						<CardDescription>Submissions by document language</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={barChartConfig} className="h-56 w-full">
							<BarChart
								data={languageBar}
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
						<CardTitle>Review funnel</CardTitle>
						<CardDescription>From submission to decision</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={funnelChartConfig} className="h-56 w-full">
							<BarChart
								layout="vertical"
								data={data.reviewFunnel}
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
		</div>
	);
}
