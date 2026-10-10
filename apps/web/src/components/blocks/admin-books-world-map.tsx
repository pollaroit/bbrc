"use client";

import type { GetAdminBookStatsOutput } from "@bbrc/api/modules/admin/admin-book.schema";
import {
	WorldMap,
	worldMapData,
} from "@bbrc/ui/components/shadcnmaps/maps/world";
import type { RegionOverride } from "@bbrc/ui/components/shadcnmaps/types";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type AdminBooksWorldMapProps = {
	countryBookCounts: GetAdminBookStatsOutput["countryBookCounts"];
};

/** Non-overlapping thresholds (5→3–5 bucket, 10→5–10, etc.). */
type CountryCountBucketId =
	| "none"
	| "1-2"
	| "3-5"
	| "5-10"
	| "10-25"
	| "25-50"
	| "50+";

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
		fillClass: "bg-[var(--chart-1)]",
	},
	{
		id: "3-5",
		label: "3–5",
		fillClass: "bg-[var(--chart-2)]",
	},
	{
		id: "5-10",
		label: "5–10",
		fillClass: "bg-[var(--chart-3)]",
	},
	{
		id: "10-25",
		label: "10–25",
		fillClass: "bg-[var(--chart-4)]",
	},
	{
		id: "25-50",
		label: "25–50",
		fillClass: "bg-[var(--chart-5)]",
	},
	{
		id: "50+",
		label: "50+",
		fillClass: "bg-[var(--chart-5)] ring-1 ring-foreground/30",
	},
];

function bucketForBookCount(count: number): CountryCountBucketId {
	if (count <= 0) {
		return "none";
	}
	if (count <= 2) {
		return "1-2";
	}
	if (count <= 5) {
		return "3-5";
	}
	if (count <= 10) {
		return "5-10";
	}
	if (count <= 25) {
		return "10-25";
	}
	if (count <= 50) {
		return "25-50";
	}
	return "50+";
}

function fillClassForBucket(bucket: CountryCountBucketId): string {
	switch (bucket) {
		case "none":
			return ZERO_BOOKS_MAP_CLASS;
		case "1-2":
			return "fill-[var(--chart-1)] stroke-[var(--chart-1)] hover:fill-[var(--chart-2)] hover:stroke-[var(--chart-2)]";
		case "3-5":
			return "fill-[var(--chart-2)] stroke-[var(--chart-2)] hover:fill-[var(--chart-3)] hover:stroke-[var(--chart-3)]";
		case "5-10":
			return "fill-[var(--chart-3)] stroke-[var(--chart-3)] hover:fill-[var(--chart-4)] hover:stroke-[var(--chart-4)]";
		case "10-25":
			return "fill-[var(--chart-4)] stroke-[var(--chart-4)] hover:fill-[var(--chart-5)] hover:stroke-[var(--chart-5)]";
		case "25-50":
			return "fill-[var(--chart-5)] stroke-[var(--chart-5)]";
		case "50+":
			return "fill-[var(--chart-5)] stroke-foreground/35 stroke-[1.5]";
		default:
			return ZERO_BOOKS_MAP_CLASS;
	}
}

export function AdminBooksWorldMap({
	countryBookCounts,
}: AdminBooksWorldMapProps) {
	const { regionOverrides, countByAlpha2 } = useMemo(() => {
		const countByAlpha2 = new Map(
			countryBookCounts.map((row) => [row.alpha2.toUpperCase(), row.bookCount]),
		);

		const regionOverrides: RegionOverride[] = worldMapData.regions.map(
			(region) => {
				const count = countByAlpha2.get(region.id.toUpperCase()) ?? 0;
				const bucket = bucketForBookCount(count);
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
				No literary origin countries in the catalog yet.
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
				aria-label="World map of books by literary origin country"
			/>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				<span className="text-muted-foreground text-xs">Books tagged:</span>
				<ul className="flex flex-wrap items-center gap-x-3 gap-y-2">
					{COUNTRY_COUNT_BUCKETS.map((bucket) => (
						<li key={bucket.id} className="flex items-center gap-1.5 text-xs">
							<span
								className={cn("size-3 shrink-0", bucket.fillClass)}
								aria-hidden
							/>
							<span className="text-muted-foreground">{bucket.label}</span>
						</li>
					))}
				</ul>
			</div>
			<p className="text-muted-foreground text-xs">
				Gray = no catalog titles with that literary origin. Darker blue = more
				titles.
			</p>
		</div>
	);
}
