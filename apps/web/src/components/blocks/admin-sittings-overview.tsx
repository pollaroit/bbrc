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
import { Plus, Sofa } from "lucide-react";
import type { Route } from "next";
import { type ReactNode, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AdminSittingRankingLists } from "@/components/blocks/admin-sitting-ranking-lists";
import { AdminSittingsToolbar } from "@/components/blocks/admin-sittings-toolbar";
import { Link } from "@/i18n/navigation";
import {
	toAdminSittingsOverviewCallInput,
	useAdminSittingsListingSearchParams,
} from "@/lib/listing/admin-sittings-listing";
import { orpc } from "@/utils/orpc";

const sittingsChartConfig = {
	count: {
		label: "Started",
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

export function AdminSittingsOverview() {
	const [params] = useAdminSittingsListingSearchParams();
	const overviewInput = toAdminSittingsOverviewCallInput(params);

	const { data, isPending, isError } = useQuery(
		orpc.admin.getSittingOverview.queryOptions({ input: overviewInput }),
	);

	const chartData = useMemo(() => {
		if (!data) {
			return [];
		}

		return data.sittingsByDay.map((point) => ({
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
				Could not load sitting overview.
			</p>
		);
	} else {
		const { kpis } = data;
		body = (
			<div className="flex flex-col gap-8">
				<div className="flex flex-wrap gap-2">
					<Button
						render={<Link href={"/sittings/new" as Route} />}
						nativeButton={false}
						size="sm"
					>
						<Plus data-icon="inline-start" />
						Start sitting
					</Button>
					<Button
						render={<Link href={"/sittings" as Route} />}
						nativeButton={false}
						variant="outline"
						size="sm"
					>
						<Sofa data-icon="inline-start" />
						Public sittings
					</Button>
				</div>

				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<StatCard label="Total sittings" value={kpis.totalSittings} />
					<StatCard label="Ongoing" value={kpis.ongoing} />
					<StatCard
						label="Voting / Reading"
						value={`${kpis.voting} / ${kpis.reading}`}
					/>
					<StatCard label="Finished" value={kpis.finished} />
					<StatCard label="With selected book" value={kpis.withSelectedBook} />
					<StatCard label="Telegram announced" value={kpis.telegramAnnounced} />
					<StatCard
						label="Overdue voting deadlines"
						value={kpis.overdueVotingDeadlines}
					/>
					<StatCard
						label="Started (30d)"
						value={kpis.startedLast30Days}
						hint={`Finished (30d): ${kpis.finishedLast30Days}`}
					/>
				</div>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Sitting activity</CardTitle>
						<CardDescription>Sittings started — last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={sittingsChartConfig}
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
					<AdminSittingRankingLists rankings={data.rankings} />
				</section>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<AdminSittingsToolbar variant="overview" />
			{body}
		</div>
	);
}
