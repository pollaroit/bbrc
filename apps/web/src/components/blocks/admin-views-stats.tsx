"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
	AdminViewsRangeSwitch,
	BreakdownCard,
	HowWeCount,
	useAdminViewsRange,
} from "@/components/blocks/admin-views-parts";
import { HeatmapGrid } from "@/components/blocks/view-insights/heatmap-grid";
import { clubTimeZone } from "@/lib/club-timezone";
import { orpc } from "@/utils/orpc";

const AdminViewsChart = dynamic(
	() => import("@/components/blocks/admin-views-chart"),
	{ ssr: false, loading: () => <Skeleton className="h-72 w-full" /> },
);

/** Stats tab: the deeper charts and breakdowns for the range. */
export function AdminViewsStats() {
	const [range] = useAdminViewsRange();
	const { data, isPending, isError } = useQuery(
		orpc.view.adminOverview.queryOptions({ input: { range } }),
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex justify-end">
				<AdminViewsRangeSwitch />
			</div>

			{isPending ? (
				<div className="flex flex-col gap-4">
					<Skeleton className="h-80 w-full" />
					<Skeleton className="h-56 w-full" />
				</div>
			) : isError || !data ? (
				<p className="text-muted-foreground text-sm">
					Could not load the views stats.
				</p>
			) : (
				<>
					<Card size="sm">
						<CardHeader>
							<CardTitle>Views per day</CardTitle>
							<CardDescription>
								Opens, list views and, as a dashed line, unique viewers. Club
								days.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<AdminViewsChart series={data.series} className="h-72 w-full" />
						</CardContent>
					</Card>

					<Card size="sm">
						<CardHeader>
							<CardTitle>When people look</CardTitle>
							<CardDescription>
								Views by weekday and hour (00 to 23), club time ({clubTimeZone}
								).
							</CardDescription>
						</CardHeader>
						<CardContent>
							<HeatmapGrid grid={data.heatmap} />
						</CardContent>
					</Card>

					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<BreakdownCard
							title="Where views come from"
							description="Page the viewer came from"
							rows={data.sources}
						/>
						<BreakdownCard
							title="Devices"
							description="Phone, tablet or computer"
							rows={data.devices}
						/>
						<BreakdownCard
							title="Browsers"
							description="What people read on"
							rows={data.browsers}
						/>
						<BreakdownCard
							title="Countries"
							description="From the host's request data"
							rows={data.countries}
						/>
					</div>

					<HowWeCount />
				</>
			)}
		</div>
	);
}
