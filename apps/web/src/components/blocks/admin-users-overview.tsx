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
import { AlertTriangle, List, MailWarning } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { type ReactNode, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AdminUserRankingLists } from "@/components/blocks/admin-user-ranking-lists";
import { AdminUsersToolbar } from "@/components/blocks/admin-users-toolbar";
import {
	toAdminUsersOverviewCallInput,
	useAdminUsersListingSearchParams,
} from "@/lib/listing/admin-users-listing";
import { orpc } from "@/utils/orpc";

const signupsChartConfig = {
	count: {
		label: "Signups",
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

export function AdminUsersOverview() {
	const [params] = useAdminUsersListingSearchParams();
	const overviewInput = toAdminUsersOverviewCallInput(params);

	const { data, isPending, isError } = useQuery(
		orpc.admin.getUserOverview.queryOptions({ input: overviewInput }),
	);

	const chartData = useMemo(() => {
		if (!data) {
			return [];
		}

		return data.signupsByDay.map((point) => ({
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
				Could not load member overview.
			</p>
		);
	} else {
		const { kpis } = data;
		body = (
			<>
				<div className="flex flex-wrap gap-2">
					<Button
						render={<Link href={"/admin/users/list" as Route} />}
						nativeButton={false}
						size="sm"
					>
						<List data-icon="inline-start" />
						Member directory
					</Button>
					{kpis.warned > 0 ? (
						<Button
							render={
								<Link href={"/admin/users/list?statuses=warned" as Route} />
							}
							nativeButton={false}
							variant="outline"
							size="sm"
						>
							<AlertTriangle data-icon="inline-start" />
							Warned ({kpis.warned})
						</Button>
					) : null}
					{kpis.banned > 0 ? (
						<Button
							render={
								<Link href={"/admin/users/list?statuses=banned" as Route} />
							}
							nativeButton={false}
							variant="outline"
							size="sm"
						>
							Banned ({kpis.banned})
						</Button>
					) : null}
					{kpis.unverifiedEmail > 0 ? (
						<Button
							render={<Link href={"/admin/users/list" as Route} />}
							nativeButton={false}
							variant="outline"
							size="sm"
						>
							<MailWarning data-icon="inline-start" />
							Unverified email ({kpis.unverifiedEmail})
						</Button>
					) : null}
				</div>

				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<StatCard label="Members" value={kpis.totalMembers} />
					<StatCard label="Admins" value={kpis.admins} />
					<StatCard label="Active" value={kpis.active} />
					<StatCard
						label="Joined (7d / 30d)"
						value={`${kpis.joinedLast7Days} / ${kpis.joinedLast30Days}`}
					/>
					<StatCard
						label="Avg XP / RP"
						value={`${kpis.averageXp} / ${kpis.averageRp}`}
					/>
					<StatCard
						label="Total XP / RP"
						value={`${kpis.totalXp} / ${kpis.totalRp}`}
					/>
					<StatCard label="Warned" value={kpis.warned} />
					<StatCard label="Banned" value={kpis.banned} />
				</div>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Membership growth</CardTitle>
						<CardDescription>New signups — last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={signupsChartConfig} className="h-52 w-full">
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
					<AdminUserRankingLists rankings={data.rankings} />
				</section>
			</>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<AdminUsersToolbar variant="overview" />
			{body}
		</div>
	);
}
