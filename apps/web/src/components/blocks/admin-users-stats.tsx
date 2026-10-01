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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { orpc } from "@/utils/orpc";

const signupChartConfig = {
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
	value: number;
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

export function AdminUsersStats() {
	const { data, isPending, isError } = useQuery(
		orpc.admin.getUserStats.queryOptions(),
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

	if (isPending) {
		return (
			<div className="flex flex-col gap-4">
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
					{Array.from({ length: 5 }, (_, i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
				<Skeleton className="h-56 w-full" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load member statistics.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
				<StatCard label="Members" value={data.totals.users} />
				<StatCard label="Admins" value={data.totals.admins} />
				<StatCard label="Active" value={data.totals.active} />
				<StatCard label="Warned" value={data.totals.warned} />
				<StatCard label="Banned" value={data.totals.banned} />
			</div>

			<div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Signups</CardTitle>
						<CardDescription>Last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={signupChartConfig} className="h-52 w-full">
							<BarChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
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
								<Bar dataKey="count" fill="var(--color-count)" radius={2} />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Club activity</CardTitle>
						<CardDescription>Totals across the library</CardDescription>
					</CardHeader>
					<CardContent>
						<dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
							<div>
								<dt className="text-muted-foreground">Posts</dt>
								<dd className="font-medium tabular-nums">
									{data.engagement.posts}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Comments</dt>
								<dd className="font-medium tabular-nums">
									{data.engagement.comments}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Likes</dt>
								<dd className="font-medium tabular-nums">
									{data.engagement.likes}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Feedbacks</dt>
								<dd className="font-medium tabular-nums">
									{data.engagement.feedbacks}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Participations</dt>
								<dd className="font-medium tabular-nums">
									{data.engagement.participations}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Favorites</dt>
								<dd className="font-medium tabular-nums">
									{data.engagement.favorites}
								</dd>
							</div>
						</dl>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
