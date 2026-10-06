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
import { BookPlus, Download, ShieldBan } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AdminBookRankingLists } from "@/components/blocks/admin-book-ranking-lists";
import { orpc } from "@/utils/orpc";

const additionsChartConfig = {
	count: {
		label: "Added",
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

export function AdminBooksOverview() {
	const { data, isPending, isError } = useQuery(
		orpc.admin.getBookOverview.queryOptions(),
	);

	const chartData = useMemo(() => {
		if (!data) {
			return [];
		}

		return data.additionsByDay.map((point) => ({
			...point,
			label: new Intl.DateTimeFormat(undefined, {
				month: "short",
				day: "numeric",
			}).format(new Date(`${point.date}T12:00:00.000Z`)),
		}));
	}, [data]);

	if (isPending) {
		return (
			<div className="flex flex-col gap-6">
				<Skeleton className="h-10 w-full max-w-2xl" />
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{Array.from({ length: 8 }, (_, i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
				<Skeleton className="h-56 w-full" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load book overview.
			</p>
		);
	}

	const { kpis } = data;

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap gap-2">
				<Button
					render={<Link href={"/books/new" as Route} />}
					nativeButton={false}
					size="sm"
				>
					<BookPlus data-icon="inline-start" />
					Add book
				</Button>
				<Button
					render={<Link href={"/books" as Route} />}
					nativeButton={false}
					variant="outline"
					size="sm"
				>
					<Download data-icon="inline-start" />
					Public catalog & export
				</Button>
				<Button
					render={<Link href={"/books/blocked" as Route} />}
					nativeButton={false}
					variant="outline"
					size="sm"
				>
					<ShieldBan data-icon="inline-start" />
					Blocked works ({kpis.blockedOpenLibraryWorks})
				</Button>
				{kpis.pendingBookRequests > 0 ? (
					<Button
						render={<Link href={"/books/new" as Route} />}
						nativeButton={false}
						variant="outline"
						size="sm"
					>
						Pending requests ({kpis.pendingBookRequests})
					</Button>
				) : null}
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard label="Total books" value={kpis.totalBooks} />
				<StatCard label="Distinct authors" value={kpis.distinctAuthors} />
				<StatCard
					label="Average / Total pages"
					value={`${kpis.averagePages} / ${kpis.totalPages}`}
				/>
				<StatCard
					label="Added (7d / 30d)"
					value={`${kpis.addedLast7Days} / ${kpis.addedLast30Days}`}
				/>
				<StatCard label="Completed" value={kpis.statusCounts.completed} />
				<StatCard label="Reading" value={kpis.statusCounts.reading} />
				<StatCard label="Wishlist" value={kpis.statusCounts.wishlist} />
				<StatCard label="Pending requests" value={kpis.pendingBookRequests} />
			</div>

			<Card size="sm">
				<CardHeader>
					<CardTitle>Catalog growth</CardTitle>
					<CardDescription>Books added — last 30 days</CardDescription>
				</CardHeader>
				<CardContent>
					<ChartContainer config={additionsChartConfig} className="h-52 w-full">
						<AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
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
				<AdminBookRankingLists rankings={data.rankings} />
			</section>
		</div>
	);
}
