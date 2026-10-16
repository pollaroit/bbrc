"use client";

import type { GetUserStatsOutput } from "@bbrc/api/modules/user/user-stats.schema";
import {
	WorldMap,
	worldMapData,
} from "@bbrc/ui/components/shadcnmaps/maps/world";
import type { RegionOverride } from "@bbrc/ui/components/shadcnmaps/types";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type UserStatsWorldMapProps = {
	countryBookCounts: GetUserStatsOutput["countryMapCounts"];
};

type CountryCountBucketId = "none" | "1-2" | "3-5" | "5-10" | "10+";

const ZERO_BOOKS_MAP_CLASS =
	"fill-[var(--muted)] stroke-[var(--border)] hover:fill-[var(--border)]";

const COUNTRY_COUNT_BUCKETS: {
	id: CountryCountBucketId;
	label: string;
	fillClass: string;
}[] = [
	{
		id: "none",
		label: "0 books",
		fillClass: "bg-[var(--muted)] ring-1 ring-border",
	},
	{
		id: "1-2",
		label: "1–2",
		fillClass: "bg-[var(--chart-1)]/40 ring-1 ring-border",
	},
	{
		id: "3-5",
		label: "3–5",
		fillClass: "bg-[var(--chart-2)]/50 ring-1 ring-border",
	},
	{
		id: "5-10",
		label: "5–10",
		fillClass: "bg-[var(--chart-3)]/60 ring-1 ring-border",
	},
	{
		id: "10+",
		label: "10+",
		fillClass: "bg-[var(--chart-4)]/75 ring-1 ring-border",
	},
];

function bucketForCount(count: number): CountryCountBucketId {
	if (count <= 0) return "none";
	if (count <= 2) return "1-2";
	if (count <= 5) return "3-5";
	if (count <= 10) return "5-10";
	return "10+";
}

function fillClassForBucket(bucket: CountryCountBucketId): string {
	switch (bucket) {
		case "none":
			return ZERO_BOOKS_MAP_CLASS;
		case "1-2":
			return "fill-[var(--chart-1)] stroke-[var(--chart-1)] hover:fill-[var(--chart-2)]";
		case "3-5":
			return "fill-[var(--chart-2)] stroke-[var(--chart-2)] hover:fill-[var(--chart-3)]";
		case "5-10":
			return "fill-[var(--chart-3)] stroke-[var(--chart-3)] hover:fill-[var(--chart-4)]";
		case "10+":
			return "fill-[var(--chart-4)] stroke-[var(--chart-4)]";
		default:
			return ZERO_BOOKS_MAP_CLASS;
	}
}

export function UserStatsWorldMap({
	countryBookCounts,
}: UserStatsWorldMapProps) {
	const { regionOverrides, countByAlpha2 } = useMemo(() => {
		const countByAlpha2 = new Map(
			countryBookCounts.map((row) => [
				row.countryCode.toUpperCase(),
				row.count,
			]),
		);

		const regionOverrides: RegionOverride[] = worldMapData.regions.map(
			(region) => {
				const count = countByAlpha2.get(region.id.toUpperCase()) ?? 0;
				const bucket = bucketForCount(count);
				return {
					id: region.id,
					className: fillClassForBucket(bucket),
					tooltipContent:
						count === 0
							? `${region.name}: 0 books`
							: `${region.name}: ${count} book${count === 1 ? "" : "s"}`,
				};
			},
		);

		return { regionOverrides, countByAlpha2 };
	}, [countryBookCounts]);

	if (countryBookCounts.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No country data for reads in this period.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<WorldMap
				className="aspect-[3/2] w-full border border-border bg-muted/10"
				regions={regionOverrides}
				showTooltips
				renderTooltip={(region) => {
					const count = countByAlpha2.get(region.id.toUpperCase()) ?? 0;
					if (count === 0) {
						return `${region.name}: 0 books`;
					}
					return `${region.name}: ${count} book${count === 1 ? "" : "s"}`;
				}}
				aria-label="World map of read books by literary origin"
			/>
			<ul className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
				{COUNTRY_COUNT_BUCKETS.filter((bucket) => bucket.id !== "none").map(
					(bucket) => (
						<li key={bucket.id} className="flex items-center gap-1.5">
							<span
								className={cn("size-3 shrink-0", bucket.fillClass)}
								aria-hidden
							/>
							<span className="text-muted-foreground">{bucket.label}</span>
						</li>
					),
				)}
			</ul>
		</div>
	);
}
