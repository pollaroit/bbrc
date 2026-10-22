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
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";
import { adminQuizStatusLabels } from "@/lib/listing/admin-quizzes-listing";
import { orpc } from "@/utils/orpc";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

const outcomeLabels = {
	ready: "Written",
	declined: "Declined",
	failed: "Failed",
} as const;

const generationConfig = {
	ready: { label: "Written", color: "var(--chart-1)" },
	declined: { label: "Declined", color: "var(--chart-3)" },
	failed: { label: "Failed", color: "var(--chart-5)" },
};
const attemptsConfig = {
	submitted: { label: "Submitted", color: "var(--chart-2)" },
	forfeited: { label: "Abandoned", color: "var(--chart-5)" },
};
const scoreConfig = { count: { label: "Attempts", color: "var(--chart-1)" } };
const difficultyConfig = {
	correctPercent: { label: "Correct", color: "var(--chart-2)" },
	wrongPercent: { label: "Wrong", color: "var(--chart-5)" },
	skippedPercent: { label: "Skipped", color: "var(--chart-3)" },
};
const valueConfig = { value: { label: "Quizzes", color: "var(--chart-3)" } };
const funnelConfig = { count: { label: "Count", color: "var(--chart-4)" } };

function dayLabel(date: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
	}).format(new Date(`${date}T12:00:00.000Z`));
}

function PieCard({
	title,
	description,
	data,
}: {
	title: string;
	description: string;
	data: { name: string; value: number }[];
}) {
	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={scoreConfig}
					className="mx-auto h-56 w-full max-w-sm"
				>
					<PieChart>
						<ChartTooltip content={<ChartTooltipContent hideLabel />} />
						<Pie
							data={data}
							dataKey="value"
							nameKey="name"
							cx="50%"
							cy="50%"
							outerRadius={80}
						>
							{data.map((entry, index) => (
								<Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
							))}
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}

export function AdminQuizzesStats() {
	const { data, isPending, isError } = useQuery(
		orpc.admin.getQuizStats.queryOptions({ input: {} }),
	);

	const statusPie = useMemo(
		() =>
			(data?.statusDistribution ?? []).map((row) => ({
				name: adminQuizStatusLabels[row.status],
				value: row.count,
			})),
		[data],
	);
	const outcomePie = useMemo(
		() =>
			(data?.generationOutcomes ?? []).map((row) => ({
				name: outcomeLabels[row.outcome],
				value: row.count,
			})),
		[data],
	);
	const generations = useMemo(
		() =>
			(data?.generationsByDay ?? []).map((point) => ({
				...point,
				label: dayLabel(point.date),
			})),
		[data],
	);
	const attempts = useMemo(
		() =>
			(data?.attemptsByDay ?? []).map((point) => ({
				...point,
				label: dayLabel(point.date),
			})),
		[data],
	);

	if (isPending) {
		return <Skeleton className="h-160 w-full" />;
	}

	if (isError || !data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load quiz stats.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<PieCard
					title="Quiz status"
					description="Where every quiz stands"
					data={statusPie}
				/>
				<PieCard
					title="AI request outcomes"
					description="Every generation request ever made"
					data={outcomePie}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Generation requests</CardTitle>
						<CardDescription>Per day, last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={generationConfig} className="h-56 w-full">
							<BarChart data={generations} margin={{ left: 0, right: 8 }}>
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
								<Bar dataKey="ready" stackId="g" fill="var(--color-ready)" />
								<Bar
									dataKey="declined"
									stackId="g"
									fill="var(--color-declined)"
								/>
								<Bar dataKey="failed" stackId="g" fill="var(--color-failed)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Attempts</CardTitle>
						<CardDescription>Started per day, last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={attemptsConfig} className="h-56 w-full">
							<BarChart data={attempts} margin={{ left: 0, right: 8 }}>
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
								<Bar
									dataKey="submitted"
									stackId="a"
									fill="var(--color-submitted)"
								/>
								<Bar
									dataKey="forfeited"
									stackId="a"
									fill="var(--color-forfeited)"
								/>
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Score distribution</CardTitle>
						<CardDescription>
							Finished attempts by score, across all quizzes
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={scoreConfig} className="h-56 w-full">
							<BarChart
								data={data.scoreDistribution}
								margin={{ left: 0, right: 8 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="score" tickLine={false} axisLine={false} />
								<YAxis allowDecimals={false} width={28} tickLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-count)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Question difficulty</CardTitle>
						<CardDescription>
							Share of answers right, wrong or skipped per question position
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={difficultyConfig} className="h-56 w-full">
							<BarChart
								data={data.questionDifficulty}
								layout="vertical"
								margin={{ left: 8, right: 8 }}
							>
								<CartesianGrid horizontal={false} />
								<XAxis
									type="number"
									domain={[0, 100]}
									unit="%"
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									type="category"
									dataKey="label"
									width={110}
									tickLine={false}
									axisLine={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar
									dataKey="correctPercent"
									stackId="d"
									fill="var(--color-correctPercent)"
								/>
								<Bar
									dataKey="wrongPercent"
									stackId="d"
									fill="var(--color-wrongPercent)"
								/>
								<Bar
									dataKey="skippedPercent"
									stackId="d"
									fill="var(--color-skippedPercent)"
								/>
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Attempts per quiz</CardTitle>
						<CardDescription>
							How many quizzes sit at each level
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={valueConfig} className="h-56 w-full">
							<BarChart
								data={data.attemptsPerQuiz}
								margin={{ left: 0, right: 8 }}
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
						<CardTitle>Engagement funnel</CardTitle>
						<CardDescription>From quizzes to finished attempts</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={funnelConfig} className="h-56 w-full">
							<BarChart
								data={data.funnel}
								layout="vertical"
								margin={{ left: 8, right: 8 }}
							>
								<CartesianGrid horizontal={false} />
								<XAxis type="number" allowDecimals={false} tickLine={false} />
								<YAxis
									type="category"
									dataKey="stage"
									width={130}
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
