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
import { type ReactNode, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AdminQuizRankingLists } from "@/components/blocks/admin-quiz-ranking-lists";
import { AdminQuizzesToolbar } from "@/components/blocks/admin-quizzes-toolbar";
import {
	toAdminQuizzesOverviewCallInput,
	useAdminQuizzesListingSearchParams,
} from "@/lib/listing/admin-quizzes-listing";
import { orpc } from "@/utils/orpc";

const chartConfig = {
	count: { label: "Generated", color: "var(--chart-1)" },
};

function StatCard({
	label,
	value,
	hint,
}: {
	label: string;
	value: string | number;
	hint?: string;
}) {
	return (
		<Card size="sm">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">{label}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="font-medium text-2xl tabular-nums">{value}</p>
				{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
			</CardContent>
		</Card>
	);
}

export function AdminQuizzesOverview() {
	const [params] = useAdminQuizzesListingSearchParams();
	const input = toAdminQuizzesOverviewCallInput(params);

	const { data, isPending, isError } = useQuery(
		orpc.admin.getQuizOverview.queryOptions({ input }),
	);

	const chartData = useMemo(
		() =>
			(data?.quizzesByDay ?? []).map((point) => ({
				...point,
				label: new Intl.DateTimeFormat(undefined, {
					month: "short",
					day: "numeric",
				}).format(new Date(`${point.date}T12:00:00.000Z`)),
			})),
		[data],
	);

	let body: ReactNode;

	if (isPending) {
		body = (
			<div className="flex flex-col gap-6">
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{Array.from({ length: 8 }, (_, i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
				<Skeleton className="h-56 w-full" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	} else if (isError || !data) {
		body = (
			<p className="text-muted-foreground text-sm">
				Could not load quiz overview.
			</p>
		);
	} else {
		const { kpis } = data;
		body = (
			<div className="flex flex-col gap-8">
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<StatCard label="Total quizzes" value={kpis.totalQuizzes} />
					<StatCard
						label="Ready / Unavailable / Generating"
						value={`${kpis.ready} / ${kpis.unavailable} / ${kpis.generating}`}
					/>
					<StatCard
						label="Finished attempts"
						value={kpis.submittedAttempts}
						hint={`${kpis.forfeitedAttempts} abandoned · ${kpis.inProgressAttempts} open`}
					/>
					<StatCard
						label="Average score"
						value={
							kpis.averageScore == null ? "—" : kpis.averageScore.toFixed(1)
						}
					/>
					<StatCard
						label="Quizzes with reports"
						value={kpis.quizzesWithReports}
						hint={`${kpis.totalReports} reports in total`}
					/>
					<StatCard
						label="Generated (30d)"
						value={kpis.createdLast30Days}
						hint={`Last 7d: ${kpis.createdLast7Days}`}
					/>
					<StatCard
						label="AI requests (24h)"
						value={kpis.generationsLast24h}
						hint={`${kpis.failedGenerationsLast24h} failed`}
					/>
				</div>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Quiz generation</CardTitle>
						<CardDescription>Quizzes created — last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="h-52 w-full">
							<AreaChart
								data={chartData}
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
								<Area
									type="monotone"
									dataKey="count"
									stroke="var(--color-count)"
									fill="var(--color-count)"
									fillOpacity={0.2}
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<section className="flex flex-col gap-4">
					<h2 className="font-semibold text-lg tracking-tight">Rankings</h2>
					<AdminQuizRankingLists rankings={data.rankings} />
				</section>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<AdminQuizzesToolbar variant="overview" />
			{body}
		</div>
	);
}
