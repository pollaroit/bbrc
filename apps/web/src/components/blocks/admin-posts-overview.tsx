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
import { Newspaper } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { type ReactNode, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AdminPostRankingLists } from "@/components/blocks/admin-post-ranking-lists";
import { AdminPostsToolbar } from "@/components/blocks/admin-posts-toolbar";
import {
	toAdminPostsOverviewCallInput,
	useAdminPostsListingSearchParams,
} from "@/lib/listing/admin-posts-listing";
import { orpc } from "@/utils/orpc";

const postsChartConfig = {
	count: {
		label: "Posted",
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

export function AdminPostsOverview() {
	const [params] = useAdminPostsListingSearchParams();
	const overviewInput = toAdminPostsOverviewCallInput(params);

	const { data, isPending, isError } = useQuery(
		orpc.admin.getPostOverview.queryOptions({ input: overviewInput }),
	);

	const chartData = useMemo(() => {
		if (!data) {
			return [];
		}

		return data.postsByDay.map((point) => ({
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
				Could not load post overview.
			</p>
		);
	} else {
		const { kpis } = data;
		body = (
			<div className="flex flex-col gap-8">
				<div className="flex flex-wrap gap-2">
					<Button
						render={<Link href={"/posts" as Route} />}
						nativeButton={false}
						variant="outline"
						size="sm"
					>
						<Newspaper data-icon="inline-start" />
						Public feed
					</Button>
				</div>

				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<StatCard label="Total posts" value={kpis.totalPosts} />
					<StatCard label="Distinct authors" value={kpis.distinctAuthors} />
					<StatCard
						label="With image / book"
						value={`${kpis.withImage} / ${kpis.withAttachedBook}`}
					/>
					<StatCard label="With attachment" value={kpis.withAttachment} />
					<StatCard label="Edited posts" value={kpis.edited} />
					<StatCard
						label="Total likes / comments"
						value={`${kpis.totalLikes} / ${kpis.totalComments}`}
					/>
					<StatCard
						label="Posted (30d)"
						value={kpis.postedLast30Days}
						hint={`Last 7d: ${kpis.postedLast7Days}`}
					/>
				</div>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Post activity</CardTitle>
						<CardDescription>Posts published — last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={postsChartConfig} className="h-52 w-full">
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
					<AdminPostRankingLists rankings={data.rankings} />
				</section>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<AdminPostsToolbar variant="overview" />
			{body}
		</div>
	);
}
