"use client";

import type { AdminViewsOverview as Overview } from "@bbrc/api/modules/view/view.schema";
import { VIEW_WEEKDAY_LABELS } from "@bbrc/shared";
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
import { Eye, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { orpc } from "@/utils/orpc";

// Charts load only once the page is open: recharts is a large dependency.
const AdminViewsChart = dynamic(
	() => import("@/components/blocks/admin-views-chart"),
	{ ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

const RANGES = ["7d", "30d", "90d"] as const;
const RANGE_OPTIONS = [
	{ id: "7d", label: "7 days" },
	{ id: "30d", label: "30 days" },
	{ id: "90d", label: "90 days" },
] as const;

const RESOURCE_LABELS: Record<
	Overview["byResource"][number]["resource"],
	string
> = {
	book: "Books",
	post: "Posts",
	shelf: "Shelves",
	review: "Reviews",
	user: "Profiles",
};

const number = (value: number) => value.toLocaleString("en-US");

function StatCard({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<Card size="sm">
			<CardContent className="flex flex-col gap-1">
				<span className="text-muted-foreground text-xs">{label}</span>
				<span className="font-semibold text-2xl tabular-nums tracking-tight">
					{value}
				</span>
				{hint ? (
					<span className="text-muted-foreground text-xs">{hint}</span>
				) : null}
			</CardContent>
		</Card>
	);
}

/** Rows with a bar behind each label, longest first. */
function BarList({
	rows,
	empty = "Nothing yet.",
}: {
	rows: { key: string; label: string; views: number }[];
	empty?: string;
}) {
	const max = Math.max(1, ...rows.map((row) => row.views));
	const total = rows.reduce((sum, row) => sum + row.views, 0);
	if (rows.length === 0) {
		return <p className="text-muted-foreground text-sm">{empty}</p>;
	}
	return (
		<ul className="flex flex-col gap-2">
			{rows.map((row) => (
				<li key={row.key} className="flex flex-col gap-1">
					<div className="flex items-baseline justify-between gap-3 text-sm">
						<span className="truncate">{row.label}</span>
						<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
							{number(row.views)} · {Math.round((row.views / total) * 100)}%
						</span>
					</div>
					<div className="h-1.5 bg-muted" aria-hidden>
						<div
							className="h-full bg-chart-1"
							style={{ width: `${(row.views / max) * 100}%` }}
						/>
					</div>
				</li>
			))}
		</ul>
	);
}

function BreakdownCard({
	title,
	description,
	rows,
}: {
	title: string;
	description: string;
	rows: Overview["sources"];
}) {
	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<BarList rows={rows.slice(0, 8)} />
			</CardContent>
		</Card>
	);
}

/** Weekday by hour, club time. Darker means more views. */
function Heatmap({ grid }: { grid: number[][] }) {
	const max = Math.max(1, ...grid.flat());
	return (
		<div className="overflow-x-auto">
			<table
				className="w-full min-w-136 border-separate border-spacing-0.5 text-3xs"
				aria-label="Views by weekday and hour"
			>
				<thead>
					<tr>
						<th className="w-8" />
						{Array.from({ length: 24 }, (_, hour) => (
							<th
								key={hour}
								scope="col"
								className="font-normal text-muted-foreground tabular-nums"
							>
								{hour % 3 === 0 ? hour : ""}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{grid.map((line, weekday) => (
						<tr key={VIEW_WEEKDAY_LABELS[weekday]}>
							<th
								scope="row"
								className="pe-1 text-start font-normal text-muted-foreground"
							>
								{VIEW_WEEKDAY_LABELS[weekday]}
							</th>
							{line.map((views, hour) => (
								<td
									key={`${weekday}-${hour}`}
									title={`${VIEW_WEEKDAY_LABELS[weekday]} ${String(hour).padStart(2, "0")}:00 · ${views} ${views === 1 ? "view" : "views"}`}
									className="h-5 bg-muted p-0"
								>
									<span
										className="block size-full bg-chart-1"
										style={{
											opacity: views === 0 ? 0 : 0.15 + 0.85 * (views / max),
										}}
									/>
									<span className="sr-only">{views}</span>
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function AdminViewsOverview() {
	const [range, setRange] = useQueryState(
		"range",
		parseAsStringLiteral(RANGES)
			.withDefault("30d")
			.withOptions({ history: "replace" }),
	);
	const { data, isPending, isError } = useQuery(
		orpc.view.adminOverview.queryOptions({ input: { range } }),
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="flex items-center gap-2 font-bold text-2xl tracking-tight">
						<Eye className="size-6" aria-hidden />
						Views
					</h1>
					<p className="max-w-2xl text-muted-foreground text-sm">
						Who is looking at what, across books, posts, shelves, reviews and
						profiles.
					</p>
				</div>
				<SegmentedControl
					label="Time range"
					value={range}
					options={RANGE_OPTIONS}
					onChange={(next) => void setRange(next)}
				/>
			</div>

			{isPending ? (
				<div className="flex flex-col gap-4">
					<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
						{Array.from({ length: 5 }, (_, index) => (
							<Skeleton key={index} className="h-24 w-full" />
						))}
					</div>
					<Skeleton className="h-80 w-full" />
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
							value={number(data.totals.opens)}
							hint="Pages opened"
						/>
						<StatCard
							label="Seen in lists"
							value={number(data.totals.impressions)}
							hint={
								data.totals.openRate != null
									? `${data.totals.openRate}% were opened`
									: "No list views yet"
							}
						/>
						<StatCard
							label="Members"
							value={number(data.totals.memberViewers)}
							hint="Signed-in viewers"
						/>
						<StatCard
							label="Guests"
							value={number(data.totals.guestViewers)}
							hint="Not signed in"
						/>
						<StatCard
							label="Bots dropped"
							value={number(data.botsDropped)}
							hint="Never counted"
						/>
					</div>

					<Card size="sm">
						<CardHeader>
							<CardTitle>Views per day</CardTitle>
							<CardDescription>
								Club days. Dashed line is unique viewers.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<AdminViewsChart series={data.series} />
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
													{number(member.views)}
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
														{number(item.views)}
													</span>
												</li>
											))}
										</ol>
									)}
								</CardContent>
							</Card>
						))}
					</div>

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

					<Card size="sm">
						<CardHeader>
							<CardTitle>When people look</CardTitle>
							<CardDescription>
								Views by weekday and hour, club time
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Heatmap grid={data.heatmap} />
						</CardContent>
					</Card>

					<Card size="sm" className="border-dashed">
						<CardContent className="flex flex-col gap-2 text-muted-foreground text-xs leading-relaxed">
							<p className="flex items-center gap-2 font-medium text-foreground text-sm">
								<ShieldCheck className="size-4" aria-hidden />
								How we count
							</p>
							<p>
								An open is someone loading the page of a book, post, shelf,
								review or profile. A list view is one of them showing up in a
								list and being at least half visible for a second. The same
								person counts once per item every 30 minutes. Crawlers, link
								previews and scripts are dropped, and people looking at their
								own content are left out. Raw views are kept for 90 days and
								then summed into daily totals.
							</p>
							<p>
								This page is only for admins. Members see their own content's
								insights, and who looked at a profile is visible to admins only.
							</p>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
