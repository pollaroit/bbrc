"use client";

import type { ActivitySessionItem } from "@bbrc/api/modules/reading-activity/reading-activity.schema";
import {
	ACTIVITY_SORT_FIELDS,
	ACTIVITY_SORT_LABELS,
	type ActivityScope,
	type ActivitySortField,
	formatActivityDuration,
	PROGRESS_SORT_FIELDS,
} from "@bbrc/shared";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ListingSort } from "@/components/listing/listing-sort";
import { orpc } from "@/utils/orpc";
import { formatMonthLabel, plural } from "./format";
import { SessionCard } from "./session-card";
import { SessionDetail } from "./session-detail";
import { type ActivityStateApi, toActivityInput } from "./use-activity-state";

const GRID = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3";

/** Newest sessions first are grouped under their month, so a long log reads like a journal. */
function groupByMonth(items: ActivitySessionItem[]) {
	const groups: { month: string; items: ActivitySessionItem[] }[] = [];
	for (const item of items) {
		const month = item.day.slice(0, 7);
		const last = groups[groups.length - 1];
		if (last && last.month === month) last.items.push(item);
		else groups.push({ month, items: [item] });
	}
	return groups;
}

/**
 * The grid: the sort and a count of what the filters leave, then one card per
 * session, loaded as you scroll.
 */
export function ActivitySessions({
	username,
	api,
	scope,
}: {
	username: string;
	api: ActivityStateApi;
	scope: ActivityScope;
}) {
	const { state, setState } = api;
	const input = {
		...toActivityInput(state),
		username,
		sortBy: state.sortBy,
		sortDirection: state.sortDirection,
		limit: 24,
	};

	const query = useInfiniteQuery(
		orpc.readingActivity.sessions.infiniteOptions({
			initialPageParam: 0,
			getNextPageParam: (last) => last.nextOffset ?? undefined,
			input: (offset: number) => ({ ...input, offset }),
		}),
	);

	const items = query.data?.pages.flatMap((page) => page.items) ?? [];
	const first = query.data?.pages[0];
	const open = items.find((item) => item.id === state.session) ?? null;
	const sortFields = ACTIVITY_SORT_FIELDS.filter(
		(field) => scope.progress || !PROGRESS_SORT_FIELDS.includes(field),
	);
	const narrowed =
		api.activeFilterCount > 0 || api.dated || state.range !== "all";
	// Months only make sense when the list runs through time.
	const byMonth = state.sortBy === "date";

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				{first ? (
					<p className="text-muted-foreground text-sm tabular-nums">
						<span className="font-medium text-foreground">
							{plural(first.total, "session")}
						</span>
						, {formatActivityDuration(first.summary.seconds)} of reading
						{first.summary.pagesGained
							? `, ${plural(first.summary.pagesGained, "page")} gained`
							: ""}
					</p>
				) : (
					<Skeleton className="h-5 w-64" />
				)}
				<ListingSort<ActivitySortField>
					sortBy={state.sortBy}
					sortDirection={state.sortDirection}
					onSortByChange={(sortBy) =>
						void setState({ sortBy: sortBy ?? "date" })
					}
					onSortDirectionChange={(sortDirection) =>
						void setState({ sortDirection: sortDirection ?? "desc" })
					}
					sortByOptions={sortFields}
					sortByLabels={ACTIVITY_SORT_LABELS}
				/>
			</div>

			<InfiniteScroll
				className="flex flex-col gap-4"
				hasNextPage={query.hasNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
				fetchNextPage={() => {
					void query.fetchNextPage();
				}}
				isPending={query.isPending}
				isError={query.isError}
				error={query.error}
				onRetry={() => {
					void query.refetch();
				}}
				isEmpty={items.length === 0}
				emptyTitle={
					narrowed
						? "No sessions match these filters"
						: "No reading sessions yet"
				}
				emptyDescription={
					narrowed
						? "Try widening the dates or removing a filter."
						: "Sessions from Reading Mode show up here once they end."
				}
				loadingContent={
					<div className={GRID}>
						{Array.from({ length: 6 }, (_, index) => (
							<Skeleton key={index} className="h-52 w-full" />
						))}
					</div>
				}
				endMessage="That is every session."
			>
				{byMonth ? (
					<div className="flex flex-col gap-8">
						{groupByMonth(items).map((group) => (
							<section key={group.month} className="flex flex-col gap-3">
								<h2 className="flex items-baseline gap-3 font-heading font-semibold text-lg tracking-tight">
									{formatMonthLabel(group.month)}
									<span className="font-normal text-muted-foreground text-sm">
										{plural(group.items.length, "session")} shown
									</span>
								</h2>
								<ul className={GRID}>
									{group.items.map((item) => (
										<li key={item.id} className="flex">
											<SessionCard
												item={item}
												onOpen={() => void setState({ session: item.id })}
											/>
										</li>
									))}
								</ul>
							</section>
						))}
					</div>
				) : (
					<ul className={GRID}>
						{items.map((item) => (
							<li key={item.id} className="flex">
								<SessionCard
									item={item}
									onOpen={() => void setState({ session: item.id })}
								/>
							</li>
						))}
					</ul>
				)}
			</InfiniteScroll>

			<SessionDetail
				item={open}
				usualSpeed={first?.usualSpeed ?? null}
				onClose={() => void setState({ session: null })}
			/>
		</div>
	);
}
