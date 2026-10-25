"use client";

import type { AdminViewsOverview as Overview } from "@bbrc/api/modules/view/view.schema";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { ShieldCheck } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { SegmentedControl } from "@/components/blocks/segmented-control";

export const VIEW_ADMIN_RANGES = ["7d", "30d", "90d"] as const;
const RANGE_OPTIONS = [
	{ id: "7d", label: "7 days" },
	{ id: "30d", label: "30 days" },
	{ id: "90d", label: "90 days" },
] as const;

export const RESOURCE_LABELS: Record<
	Overview["byResource"][number]["resource"],
	string
> = {
	book: "Books",
	post: "Posts",
	shelf: "Shelves",
	review: "Reviews",
	user: "Profiles",
};

export const RESOURCE_SINGULAR: Record<
	Overview["byResource"][number]["resource"],
	string
> = {
	book: "Book",
	post: "Post",
	shelf: "Shelf",
	review: "Review",
	user: "Profile",
};

export const formatNumber = (value: number) => value.toLocaleString("en-US");

/** The 7/30/90 day range kept in the URL (`?range=`), shared by Overview and Stats. */
export function useAdminViewsRange() {
	return useQueryState(
		"range",
		parseAsStringLiteral(VIEW_ADMIN_RANGES)
			.withDefault("30d")
			.withOptions({ history: "replace" }),
	);
}

export function AdminViewsRangeSwitch() {
	const [range, setRange] = useAdminViewsRange();
	return (
		<SegmentedControl
			label="Time range"
			value={range}
			options={RANGE_OPTIONS}
			onChange={(next) => void setRange(next)}
		/>
	);
}

export function StatCard({
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
export function BarList({
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
							{formatNumber(row.views)} ·{" "}
							{total > 0 ? Math.round((row.views / total) * 100) : 0}%
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

export function BreakdownCard({
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

export function HowWeCount() {
	return (
		<Card size="sm" className="border-dashed">
			<CardContent className="flex flex-col gap-2 text-muted-foreground text-xs leading-relaxed">
				<p className="flex items-center gap-2 font-medium text-foreground text-sm">
					<ShieldCheck className="size-4" aria-hidden />
					How we count
				</p>
				<p>
					An open is someone loading the page of a book, post, shelf, review or
					profile. A list view is one of them showing up in a list and being at
					least half visible for a second. The same person counts once per item
					every 30 minutes. Crawlers, link previews and scripts are dropped, and
					people looking at their own content are left out. Raw views are kept
					for 90 days and then summed into daily totals.
				</p>
				<p>
					These pages are only for admins. Members see their own content's
					insights, and who looked at a profile is visible to admins only.
				</p>
			</CardContent>
		</Card>
	);
}
