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
import { ListOrdered, ListPlus } from "lucide-react";
import type { Route } from "next";
import { type ReactNode, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AdminSeriesRankingLists } from "@/components/blocks/admin-series-ranking-lists";
import { AdminSeriesToolbar } from "@/components/blocks/admin-series-toolbar";
import { Link } from "@/i18n/navigation";
import {
	toAdminSeriesOverviewCallInput,
	useAdminSeriesListingSearchParams,
} from "@/lib/listing/admin-series-listing";
import { orpc } from "@/utils/orpc";

const seriesChartConfig = {
	count: {
		label: "Created",
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

export function AdminSeriesOverview() {
	const [params] = useAdminSeriesListingSearchParams();
	const overviewInput = toAdminSeriesOverviewCallInput(params);

	const { data, isPending, isError } = useQuery(
		orpc.admin.getSeriesOverview.queryOptions({ input: overviewInput }),
	);

	const chartData = useMemo(() => {
		if (!data) {
			return [];
		}

		return data.seriesByDay.map((point) => ({
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
					{Array.from({ length: 6 }, (_, i) => (
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
				Could not load series overview.
			</p>
		);
	} else {
		const { kpis } = data;
		body = (
			<div className="flex flex-col gap-8">
				<div className="flex flex-wrap gap-2">
					<Button
						render={<Link href={"/admin/series/new" as Route} />}
						nativeButton={false}
						size="sm"
					>
						<ListPlus data-icon="inline-start" />
						New series
					</Button>
					<Button
						render={<Link href={"/series" as Route} />}
						nativeButton={false}
						variant="outline"
						size="sm"
					>
						<ListOrdered data-icon="inline-start" />
						Browse public series
					</Button>
				</div>

				<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
					<StatCard label="Total series" value={kpis.totalSeries} />
					<StatCard
						label="Books in series"
						value={kpis.totalBooksInSeries}
						hint={`Avg ${kpis.avgBooksPerSeries} per series`}
					/>
					<StatCard label="Empty series" value={kpis.emptySeries} />
					<StatCard label="With description" value={kpis.withDescription} />
					<StatCard
						label="Created (30d)"
						value={kpis.createdLast30Days}
						hint={`Last 7d: ${kpis.createdLast7Days}`}
					/>
				</div>

				<Card size="sm">
					<CardHeader>
						<CardTitle>New series</CardTitle>
						<CardDescription>Series created — last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={seriesChartConfig} className="h-52 w-full">
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
					<AdminSeriesRankingLists rankings={data.rankings} />
				</section>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<AdminSeriesToolbar variant="overview" />
			{body}
		</div>
	);
}
