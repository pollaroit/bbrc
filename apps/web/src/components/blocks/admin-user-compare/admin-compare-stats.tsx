"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
	BandBreakdown,
	MembersScatter,
	ReadingCircles,
	ScoreHistogram,
} from "@/components/blocks/admin-user-compare/admin-compare-charts";
import { AdminCompareHeatmap } from "@/components/blocks/admin-user-compare/admin-compare-heatmap";
import {
	MemberRankCards,
	PairRankList,
} from "@/components/blocks/admin-user-compare/admin-compare-rankings";
import { AdminCompareStatsToolbar } from "@/components/blocks/admin-user-compare/admin-compare-stats-toolbar";
import { formatNumber } from "@/components/blocks/author/author-stats-frame";
import {
	type AdminCompareStatsParams,
	toAdminCompareStatsFilters,
	useAdminCompareStatsSearchParams,
} from "@/lib/listing/admin-user-compare-listing";
import { client, orpc } from "@/utils/orpc";

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
			<CardHeader className="pb-1">
				<CardTitle className="font-normal text-muted-foreground text-xs">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="font-medium text-2xl tabular-nums">{value}</p>
				{hint ? (
					<p className="mt-0.5 truncate text-muted-foreground text-xs">
						{hint}
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}

/** Same footprint as the loaded page so nothing jumps when the numbers arrive. */
function StatsSkeleton() {
	return (
		<div className="flex flex-col gap-6" aria-hidden>
			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
				{["a", "b", "c", "d", "e", "f"].map((key) => (
					<Skeleton key={key} className="h-24" />
				))}
			</div>
			<div className="grid gap-4 xl:grid-cols-2">
				<Skeleton className="h-[34rem]" />
				<Skeleton className="h-[34rem]" />
			</div>
			<Skeleton className="h-[30rem]" />
			<div className="grid gap-4 xl:grid-cols-2">
				<Skeleton className="h-80" />
				<Skeleton className="h-80" />
			</div>
		</div>
	);
}

function agoLabel(iso: string, cached: boolean) {
	const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
	const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
	const minutes = Math.round(seconds / 60);
	const when =
		Math.abs(seconds) < 60
			? "just now"
			: Math.abs(minutes) < 60
				? formatter.format(minutes, "minute")
				: formatter.format(Math.round(minutes / 60), "hour");
	return `Calculated ${when}${cached ? " (saved for an hour)" : ""}`;
}

export function AdminCompareStats() {
	const [params, setParams] = useAdminCompareStatsSearchParams();
	const queryClient = useQueryClient();
	const filters = toAdminCompareStatsFilters(params as AdminCompareStatsParams);
	const options = orpc.userCompareAdmin.stats.queryOptions({
		input: { filters },
	});
	const { data, isPending, isError, isFetching } = useQuery({
		...options,
		placeholderData: (previous) => previous,
		staleTime: 60_000,
	});

	const recalculate = useMutation({
		mutationFn: () => client.userCompareAdmin.stats({ filters, fresh: true }),
		onSuccess: (result) => {
			queryClient.setQueryData(options.queryKey, result);
			toast.success("Recalculated");
		},
		onError: () => toast.error("Could not recalculate the scores"),
	});

	return (
		<div className="flex flex-col gap-6">
			<AdminCompareStatsToolbar
				params={params as AdminCompareStatsParams}
				onChange={(patch) => setParams(patch)}
				onClear={() =>
					setParams({
						users: null,
						books: null,
						authors: null,
						series: null,
						subjects: null,
						from: null,
						to: null,
					})
				}
				onRecalculate={() => recalculate.mutate()}
				isRecalculating={recalculate.isPending}
				calculatedLabel={data ? agoLabel(data.computedAt, data.cached) : null}
			/>

			{data && data.unknownFilters.length > 0 ? (
				<p
					role="status"
					className="flex items-start gap-2 border border-warning/40 bg-warning/10 p-3 text-sm text-warning-ink"
				>
					<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
					<span>
						Nothing matched {data.unknownFilters.join(", ")}, so{" "}
						{data.unknownFilters.length === 1 ? "it was" : "they were"} ignored
						or counted no reads.
					</span>
				</p>
			) : null}

			{isPending ? (
				<StatsSkeleton />
			) : isError || !data ? (
				<p className="border border-border bg-card p-6 text-center text-sm">
					The scores could not be loaded. Try again with Recalculate.
				</p>
			) : (
				<div
					className="flex flex-col gap-6 transition-opacity data-[stale=true]:opacity-60"
					data-stale={isFetching}
					aria-busy={isFetching}
				>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
						<StatCard
							label="Members compared"
							value={formatNumber(data.totals.members)}
							hint={`${formatNumber(data.totals.membersInUniverse)} in the filters`}
						/>
						<StatCard
							label="Pairs scored"
							value={formatNumber(data.totals.pairs)}
							hint={`${formatNumber(data.totals.listedPairs)} listed below`}
						/>
						<StatCard
							label="Average score"
							value={
								data.totals.pairs > 0
									? data.totals.averageScore.toFixed(1)
									: "–"
							}
						/>
						<StatCard
							label="Highest pair"
							value={data.topPairs[0] ? String(data.topPairs[0].score) : "–"}
							hint={
								data.topPairs[0]
									? `${data.topPairs[0].a.name} and ${data.topPairs[0].b.name}`
									: undefined
							}
						/>
						<StatCard
							label="Lowest pair"
							value={
								data.bottomPairs[0] ? String(data.bottomPairs[0].score) : "–"
							}
							hint={
								data.bottomPairs[0]
									? `${data.bottomPairs[0].a.name} and ${data.bottomPairs[0].b.name}`
									: undefined
							}
						/>
						<StatCard
							label="Reads counted"
							value={formatNumber(data.totals.reads)}
							hint={`${formatNumber(data.totals.books)} books`}
						/>
					</div>

					<div className="grid gap-4 xl:grid-cols-2">
						<PairRankList
							title="Most alike"
							description="The ten highest scores. Pairs need 3 shared books, or 5 reads each."
							pairs={data.topPairs}
							tone="high"
							emptyText="No pair has enough reads in common yet."
						/>
						<PairRankList
							title="Least alike"
							description="The ten lowest scores, with the same minimum."
							pairs={data.bottomPairs}
							tone="low"
							emptyText="No pair has enough reads to be listed yet."
						/>
					</div>

					<div className="grid gap-6 xl:grid-cols-2">
						<MemberRankCards
							title="Closest to the club"
							description="Members whose best five matches score highest, so they read what others read."
							members={data.mostSimilarMembers}
							metric="similarity"
							emptyText="Members need at least 3 reads to be ranked."
						/>
						<MemberRankCards
							title="Reading their own way"
							description="Members with the lowest average score across everyone, so their shelf is rare."
							members={data.mostUniqueMembers}
							metric="meanScore"
							emptyText="Members need at least 3 reads to be ranked."
						/>
					</div>

					<AdminCompareHeatmap matrix={data.matrix} />

					<div className="grid gap-4 xl:grid-cols-2">
						<ScoreHistogram stats={data} />
						<BandBreakdown stats={data} />
					</div>

					<div className="grid gap-4 xl:grid-cols-2">
						<MembersScatter stats={data} />
						<ReadingCircles stats={data} />
					</div>
				</div>
			)}
		</div>
	);
}
