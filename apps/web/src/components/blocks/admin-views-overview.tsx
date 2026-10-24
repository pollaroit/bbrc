"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@bbrc/ui/components/avatar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
	AdminViewsRangeSwitch,
	BarList,
	formatNumber,
	RESOURCE_LABELS,
	StatCard,
	useAdminViewsRange,
} from "@/components/blocks/admin-views-parts";
import { orpc } from "@/utils/orpc";

// Charts load only once the page is open: recharts is a large dependency.
const AdminViewsChart = dynamic(
	() => import("@/components/blocks/admin-views-chart"),
	{ ssr: false, loading: () => <Skeleton className="h-44 w-full" /> },
);

/** Overview tab: the numbers for the range and what gets looked at most. */
export function AdminViewsOverview() {
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
					<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
						{Array.from({ length: 5 }, (_, index) => (
							<Skeleton key={index} className="h-24 w-full" />
						))}
					</div>
					<Skeleton className="h-64 w-full" />
				</div>
			) : isError || !data ? (
				<p className="text-muted-foreground text-sm">
					Could not load the views overview.
				</p>
			) : (
				<>
					<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
						<StatCard
							label="Opens"
							value={formatNumber(data.totals.opens)}
							hint="Pages opened"
						/>
						<StatCard
							label="Seen in lists"
							value={formatNumber(data.totals.impressions)}
							hint={
								data.totals.openRate != null
									? `${data.totals.openRate}% were opened`
									: "No list views yet"
							}
						/>
						<StatCard
							label="Members"
							value={formatNumber(data.totals.memberViewers)}
							hint="Signed-in viewers"
						/>
						<StatCard
							label="Guests"
							value={formatNumber(data.totals.guestViewers)}
							hint="Not signed in"
						/>
						<StatCard
							label="Bots dropped"
							value={formatNumber(data.botsDropped)}
							hint="Never counted"
						/>
					</div>

					<Card size="sm">
						<CardHeader>
							<CardTitle>Views per day</CardTitle>
							<CardDescription>
								Club days. The Stats tab has the full chart and breakdowns.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<AdminViewsChart series={data.series} className="h-44 w-full" />
						</CardContent>
					</Card>

					<div className="grid gap-4 lg:grid-cols-2">
						<Card size="sm">
							<CardHeader>
								<CardTitle>What gets looked at</CardTitle>
								<CardDescription>Opens by kind of content</CardDescription>
							</CardHeader>
							<CardContent>
								<BarList
									rows={[...data.byResource]
										.sort((a, b) => b.opens - a.opens)
										.map((row) => ({
											key: row.resource,
											label: RESOURCE_LABELS[row.resource],
											views: row.opens,
										}))}
								/>
							</CardContent>
						</Card>
						<Card size="sm">
							<CardHeader>
								<CardTitle>Most active members</CardTitle>
								<CardDescription>Signed-in members by views</CardDescription>
							</CardHeader>
							<CardContent>
								{data.mostActiveMembers.length === 0 ? (
									<p className="text-muted-foreground text-sm">Nothing yet.</p>
								) : (
									<ul className="flex flex-col divide-y divide-border">
										{data.mostActiveMembers.map((member) => (
											<li
												key={member.username}
												className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
											>
												<Avatar className="size-7">
													{member.image ? (
														<AvatarImage src={member.image} alt="" />
													) : null}
													<AvatarFallback>
														{member.name.slice(0, 1).toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<Link
													href={`/users/${member.username}` as Route}
													className="min-w-0 flex-1 truncate text-sm hover:underline"
												>
													{member.name}
													<span className="ms-1.5 text-muted-foreground text-xs">
														@{member.username}
													</span>
												</Link>
												<span className="text-muted-foreground text-xs tabular-nums">
													{formatNumber(member.views)}
												</span>
											</li>
										))}
									</ul>
								)}
							</CardContent>
						</Card>
					</div>

					<div className="grid gap-4 lg:grid-cols-2">
						{data.top.map((group) => (
							<Card key={group.resource} size="sm">
								<CardHeader>
									<CardTitle>
										Top {RESOURCE_LABELS[group.resource].toLowerCase()}
									</CardTitle>
									<CardDescription>Most opened in this range</CardDescription>
								</CardHeader>
								<CardContent>
									{group.items.length === 0 ? (
										<p className="text-muted-foreground text-sm">
											Nothing yet.
										</p>
									) : (
										<ol className="flex flex-col divide-y divide-border">
											{group.items.map((item, index) => (
												<li
													key={item.ref}
													className="flex items-baseline gap-3 py-2 first:pt-0 last:pb-0"
												>
													<span className="w-4 shrink-0 text-muted-foreground text-xs tabular-nums">
														{index + 1}
													</span>
													<Link
														href={item.href as Route}
														className="min-w-0 flex-1 truncate text-sm hover:underline"
													>
														{item.title}
													</Link>
													<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
														{formatNumber(item.views)}
													</span>
												</li>
											))}
										</ol>
									)}
								</CardContent>
							</Card>
						))}
					</div>
				</>
			)}
		</div>
	);
}
