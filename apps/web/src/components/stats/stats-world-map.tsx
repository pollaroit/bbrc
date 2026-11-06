"use client";

import { getBookCountryName } from "@bbrc/shared";
import { MapControls } from "@bbrc/ui/components/shadcnmaps/map-controls";
import {
	WorldMap,
	worldMapData,
} from "@bbrc/ui/components/shadcnmaps/maps/world";
import type { RegionOverride } from "@bbrc/ui/components/shadcnmaps/types";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { StatsEmpty } from "./stats-kit";

/*
 * Books by where they come from. Zoom with the buttons or Ctrl/⌘ + scroll (plain scroll
 * still scrolls the page), drag to pan. With `hrefFor`, a country that has books opens
 * the reads behind it.
 */

const BUCKETS = [
	{
		id: "1-2",
		label: "1–2",
		swatch: "bg-[var(--chart-1)]/40",
		max: 2,
		fill: "fill-[var(--chart-1)] stroke-[var(--chart-1)] hover:fill-[var(--chart-2)]",
	},
	{
		id: "3-5",
		label: "3–5",
		swatch: "bg-[var(--chart-2)]/50",
		max: 5,
		fill: "fill-[var(--chart-2)] stroke-[var(--chart-2)] hover:fill-[var(--chart-3)]",
	},
	{
		id: "6-10",
		label: "6–10",
		swatch: "bg-[var(--chart-3)]/60",
		max: 10,
		fill: "fill-[var(--chart-3)] stroke-[var(--chart-3)] hover:fill-[var(--chart-4)]",
	},
	{
		id: "10+",
		label: "More than 10",
		swatch: "bg-[var(--chart-4)]/75",
		max: Number.POSITIVE_INFINITY,
		fill: "fill-[var(--chart-4)] stroke-[var(--chart-4)]",
	},
] as const;

const EMPTY_FILL =
	"fill-[var(--muted)] stroke-[var(--border)] hover:fill-[var(--border)]";

function bucketOf(count: number) {
	return (
		BUCKETS.find((bucket) => count <= bucket.max) ?? BUCKETS[BUCKETS.length - 1]
	);
}

const books = (count: number) => `${count} book${count === 1 ? "" : "s"}`;

export function StatsWorldMap({
	counts,
	hrefFor,
}: {
	counts: readonly { code: string; count: number }[];
	hrefFor?: (code: string) => string | null;
}) {
	const router = useRouter();
	const byCode = useMemo(
		() => new Map(counts.map((row) => [row.code.toUpperCase(), row.count])),
		[counts],
	);
	const regions = useMemo<RegionOverride[]>(
		() =>
			worldMapData.regions.map((region) => {
				const count = byCode.get(region.id.toUpperCase()) ?? 0;
				return {
					id: region.id,
					className: count === 0 ? EMPTY_FILL : bucketOf(count).fill,
					// A country with nothing behind it is not a link.
					disabled: count === 0 ? !hrefFor : false,
				};
			}),
		[byCode, hrefFor],
	);

	if (counts.length === 0) {
		return <StatsEmpty>No country data for these books.</StatsEmpty>;
	}

	return (
		<div className="flex flex-col gap-3">
			<WorldMap
				className={cn(
					"aspect-[3/2] w-full border border-border bg-muted/10",
					hrefFor && "[&_path]:cursor-pointer",
				)}
				regions={regions}
				enableZoom
				controls={<MapControls position="bottom-right" />}
				showTooltips
				renderTooltip={(region) => {
					const count = byCode.get(region.id.toUpperCase()) ?? 0;
					const name = getBookCountryName(region.id) ?? region.name;
					return count === 0 ? `${name}: none` : `${name}: ${books(count)}`;
				}}
				onRegionClick={(event) => {
					const code = event.region.id.toUpperCase();
					if ((byCode.get(code) ?? 0) === 0) return;
					const href = hrefFor?.(code);
					if (href) router.push(href as never);
				}}
				aria-label="World map of books by where they come from"
			/>
			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-muted-foreground text-xs">
				<ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
					{BUCKETS.map((bucket) => (
						<li key={bucket.id} className="flex items-center gap-1.5">
							<span
								className={cn("size-3 ring-1 ring-border", bucket.swatch)}
								aria-hidden
							/>
							{bucket.label}
						</li>
					))}
				</ul>
				<span>Zoom with the buttons or Ctrl/⌘ + scroll. Drag to move.</span>
			</div>
		</div>
	);
}
