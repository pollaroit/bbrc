"use client";

import { Button } from "@bbrc/ui/components/button";
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
import { MessageSquareQuote } from "lucide-react";
import type { Route } from "next";
import { type ReactNode, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AdminFeedbackRankingLists } from "@/components/blocks/admin-feedback-ranking-lists";
import { AdminFeedbacksToolbar } from "@/components/blocks/admin-feedbacks-toolbar";
import { Link } from "@/i18n/navigation";
import {
	toAdminFeedbacksOverviewCallInput,
	useAdminFeedbacksListingSearchParams,
} from "@/lib/listing/admin-feedbacks-listing";
import { orpc } from "@/utils/orpc";

const feedbacksChartConfig = {
	count: {
		label: "Submitted",
		color: "var(--chart-1)",
	},
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

export function AdminFeedbacksOverview() {
	const [params] = useAdminFeedbacksListingSearchParams();
	const overviewInput = toAdminFeedbacksOverviewCallInput(params);

	const { data, isPending, isError } = useQuery(
		orpc.admin.getFeedbackOverview.queryOptions({ input: overviewInput }),
	);

	const chartData = useMemo(() => {
		if (!data) {
			return [];
		}

		return data.feedbacksByDay.map((point) => ({
			...point,
			label: new Intl.DateTimeFormat(undefined, {
				month: "short",
				day: "numeric",
			}).format(new Date(`${point.date}T12:00:00.000Z`)),
		}));
	}, [data]);

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
				Could not load feedback overview.
			</p>
		);
	} else {
		const { kpis } = data;
		body = (
			<div className="flex flex-col gap-8">
				<div className="flex flex-wrap gap-2">
					<Button
						render={<Link href={"/books" as Route} />}
						nativeButton={false}
						variant="outline"
						size="sm"
					>
						<MessageSquareQuote data-icon="inline-start" />
						Browse catalog
					</Button>
				</div>

				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<StatCard label="Total feedbacks" value={kpis.totalFeedbacks} />
					<StatCard
						label="Average / median rating"
						value={`${kpis.averageRating.toFixed(2)} / ${kpis.medianRating.toFixed(1)}`}
					/>
					<StatCard label="With comments" value={kpis.withComments} />
					<StatCard label="With likes" value={kpis.withLikes} />
					<StatCard label="In posts" value={kpis.inPosts} />
					<StatCard
						label="Books / reviewers"
						value={`${kpis.distinctBooksReviewed} / ${kpis.distinctReviewers}`}
					/>
					<StatCard
						label="Submitted (7d / 30d)"
						value={`${kpis.submittedLast7Days} / ${kpis.submittedLast30Days}`}
					/>
				</div>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Review activity</CardTitle>
						<CardDescription>
							Feedbacks submitted — last 30 days
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={feedbacksChartConfig}
							className="h-52 w-full"
						>
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
					<AdminFeedbackRankingLists rankings={data.rankings} />
				</section>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<AdminFeedbacksToolbar variant="overview" />
			{body}
		</div>
	);
}
