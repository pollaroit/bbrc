"use client";

import {
	INSIGHT_RANGES,
	type InsightRange,
	type ViewResourceKind,
} from "@bbrc/shared";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Eye, Info } from "lucide-react";
import dynamic from "next/dynamic";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { orpc } from "@/utils/orpc";
import { InsightBreakdowns } from "./insight-breakdowns";
import {
	InsightAudience,
	InsightComparison,
	InsightEngagement,
	InsightFunnel,
} from "./insight-cards";
import { RANGE_OPTIONS, RANGE_PHRASE } from "./insight-format";
import { InsightHeatmap } from "./insight-heatmap";
import { InsightPanel } from "./insight-panel";
import { InsightStatStrip } from "./insight-stats";
import { InsightViewers } from "./insight-viewers";
import type { ChartMetric } from "./views-chart";

// Recharts is the heaviest part of the page, so it loads only when insights open.
const ViewsChart = dynamic(
	() => import("./views-chart").then((mod) => mod.ViewsChart),
	{
		ssr: false,
		loading: () => <Skeleton className="h-56 w-full sm:h-64" aria-hidden />,
	},
);

const METRICS: { id: ChartMetric; label: string }[] = [
	{ id: "opens", label: "Opens" },
	{ id: "impressions", label: "Seen in lists" },
	{ id: "uniqueViewers", label: "Viewers" },
];

type ViewInsightsViewProps = {
	resource: ViewResourceKind;
	/** Slug, username, `username/slug` for a shelf, or the review's slug. */
	reference: string;
};

function HowWeCount() {
	return (
		<details className="group border border-border bg-card text-sm">
			<summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">
				<Info className="size-4 text-muted-foreground" aria-hidden />
				How we count
			</summary>
			<ul className="flex flex-col gap-2 border-border border-t px-4 py-3 text-muted-foreground text-xs leading-relaxed">
				<li>
					An <strong className="text-foreground">open</strong> is someone
					visiting its own page.{" "}
					<strong className="text-foreground">Seen in lists</strong> is it
					showing up on a feed, shelves page or similar for a second or more.
				</li>
				<li>
					The same person counts once per 30 minutes, so refreshing or flicking
					between tabs does not add up.
				</li>
				<li>
					Search engines, link previews and other robots are left out, and so
					are your own visits.
				</li>
				<li>
					Days are in club time. Detailed figures are kept for 90 days; older
					days are kept as daily totals.
				</li>
			</ul>
		</details>
	);
}

function EmptyState({ range }: { range: InsightRange }) {
	return (
		<div className="flex flex-col items-start gap-3 border border-border border-dashed p-6">
			<span className="flex size-9 items-center justify-center border border-border text-muted-foreground">
				<Eye className="size-4" aria-hidden />
			</span>
			<div className="flex flex-col gap-1">
				<p className="font-heading font-semibold text-lg tracking-tight">
					No views yet
				</p>
				<p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
					Nobody has looked in {RANGE_PHRASE[range]}. Views appear here soon
					after someone opens it or sees it in a list. Your own visits, robots
					and repeat visits within 30 minutes are not counted.
				</p>
			</div>
		</div>
	);
}

function LoadingState() {
	return (
		<div className="flex flex-col gap-4" aria-busy aria-hidden>
			<Skeleton className="h-24 w-full" />
			<Skeleton className="h-72 w-full" />
			<div className="grid gap-4 md:grid-cols-2">
				<Skeleton className="h-56 w-full" />
				<Skeleton className="h-56 w-full" />
			</div>
		</div>
	);
}

/** Everything about who looked at one book, post, shelf, review or profile. */
export function ViewInsightsView({
	resource,
	reference,
}: ViewInsightsViewProps) {
	const [range, setRange] = useQueryState(
		"range",
		parseAsStringLiteral(INSIGHT_RANGES)
			.withDefault("30d")
			.withOptions({ history: "replace" }),
	);
	const [metric, setMetric] = useState<ChartMetric>("opens");

	const query = useQuery({
		...orpc.view.insights.queryOptions({
			input: { resource, ref: reference, range },
		}),
		placeholderData: (previous) => previous,
	});

	const insights = query.data;
	const compareLabel =
		range === "7d" ? "the 7 days before" : "the 30 days before";

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<SegmentedControl<InsightRange>
					label="Time range"
					value={range}
					options={RANGE_OPTIONS}
					onChange={(next) => void setRange(next)}
				/>
				{insights && query.isFetching ? (
					<span className="text-muted-foreground text-xs" aria-live="polite">
						Updating…
					</span>
				) : null}
			</div>

			{query.isPending ? (
				<LoadingState />
			) : query.isError || !insights ? (
				<div
					className="border border-destructive/40 bg-destructive/5 p-4 text-sm"
					role="alert"
				>
					<p className="font-medium">Insights could not load</p>
					<p className="text-muted-foreground">
						{query.error?.message ?? "Please try again in a moment."}
					</p>
				</div>
			) : insights.totals.opens + insights.totals.impressions === 0 ? (
				<>
					<EmptyState range={range} />
					<HowWeCount />
				</>
			) : (
				<>
					<InsightStatStrip
						totals={insights.totals}
						previous={insights.previous}
						compareLabel={compareLabel}
					/>

					<InsightPanel
						title="Views over time"
						description="One point per day, in club time."
						action={
							<SegmentedControl<ChartMetric>
								label="Metric"
								value={metric}
								options={METRICS}
								onChange={setMetric}
							/>
						}
					>
						<ViewsChart series={insights.series} metric={metric} />
					</InsightPanel>

					<div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
						<InsightHeatmap
							grid={insights.heatmap}
							bestSlots={insights.bestSlots}
						/>
						<div className="flex min-w-0 flex-col gap-4">
							{insights.comparison ? (
								<InsightComparison
									comparison={insights.comparison}
									resource={insights.resource}
								/>
							) : null}
							<InsightAudience audience={insights.audience} />
						</div>
					</div>

					{insights.engagement || insights.funnel ? (
						<div className="grid gap-4">
							{insights.engagement ? (
								<InsightEngagement engagement={insights.engagement} />
							) : null}
							{insights.funnel ? (
								<InsightFunnel funnel={insights.funnel} />
							) : null}
						</div>
					) : null}

					<InsightBreakdowns insights={insights} />

					{insights.canSeeViewers &&
					insights.topViewers &&
					insights.recentViewers ? (
						<InsightViewers
							top={insights.topViewers}
							recent={insights.recentViewers}
						/>
					) : null}

					{insights.approximate ? (
						<p className="text-muted-foreground text-xs leading-relaxed">
							Older than 90 days: guest counts are approximate, and browsers and
							systems cover the last 90 days only.
						</p>
					) : null}

					<HowWeCount />
				</>
			)}
		</div>
	);
}
