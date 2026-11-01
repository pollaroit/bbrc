"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Flag, Inbox } from "lucide-react";
import { ReportCase } from "@/components/blocks/reports-admin/report-case";
import { ReportListItem } from "@/components/blocks/reports-admin/report-list-item";
import { ReportsToolbar } from "@/components/blocks/reports-admin/reports-toolbar";
import {
	itemKey,
	useReportsQueueState,
} from "@/components/blocks/reports-admin/use-reports-queue-state";
import { useMediaQuery } from "@/lib/reading-mode/use-media-query";
import { orpc } from "@/utils/orpc";

/**
 * The moderation inbox: the queue on the left, the selected item's case on the
 * right. On a phone the case opens in a sheet. Which item is open is in the
 * address (`?item=`), like every other bit of state here.
 */
export function AdminReportsQueue() {
	const state = useReportsQueueState();
	const isWide = useMediaQuery("(min-width: 1024px)");
	const query = useQuery({
		...orpc.report.list.queryOptions({
			input: {
				tab: state.tab,
				target: state.kind ?? undefined,
				reason: state.reason ?? undefined,
				sortBy: state.sortBy,
				sortDirection: state.sortDirection,
				page: state.page,
				limit: 20,
			},
		}),
		placeholderData: keepPreviousData,
	});

	const data = query.data;
	const items = data?.items ?? [];
	const picked = items.find(
		(group) => itemKey(group.target, group.targetId) === state.item,
	);
	// A wide screen always shows a case: the one you picked, else the first.
	// After you decide, the item leaves the open tab and the next one comes up.
	const selected = picked ?? (isWide ? items[0] : undefined);
	const selectedKey = selected
		? itemKey(selected.target, selected.targetId)
		: null;
	const filtered = Boolean(state.kind || state.reason);

	return (
		<div className="flex flex-col gap-5">
			<ReportsToolbar state={state} openTotal={data?.openTotal} />

			{query.isPending ? (
				<div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
					<div className="flex flex-col gap-2">
						{Array.from({ length: 5 }, (_, index) => (
							<Skeleton key={index} className="h-[4.5rem] w-full" />
						))}
					</div>
					<Skeleton className="hidden h-96 w-full lg:block" />
				</div>
			) : query.isError ? (
				<p className="text-destructive text-sm" role="alert">
					Could not load reports: {query.error.message}
				</p>
			) : items.length === 0 ? (
				<Empty className="border py-16">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							{state.tab === "open" ? <Inbox /> : <Flag />}
						</EmptyMedia>
						<EmptyTitle>
							{filtered
								? "No reports match these filters"
								: state.tab === "open"
									? "Nothing to review"
									: "No closed reports yet"}
						</EmptyTitle>
						<EmptyDescription>
							{filtered
								? "Try a different kind or reason."
								: state.tab === "open"
									? "When a member reports something, it shows up here."
									: "Reports you resolve or dismiss are kept here."}
						</EmptyDescription>
					</EmptyHeader>
					{filtered ? (
						<Button variant="outline" size="sm" onClick={state.clearFilters}>
							Clear filters
						</Button>
					) : null}
				</Empty>
			) : (
				<div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
					<div className="flex flex-col gap-2 lg:sticky lg:top-4">
						<ul className="flex flex-col divide-y divide-border border border-border bg-card lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto">
							{items.map((group) => {
								const key = itemKey(group.target, group.targetId);
								return (
									<li key={key}>
										<ReportListItem
											group={group}
											selected={key === selectedKey}
											onSelect={() => state.setItem(key)}
										/>
									</li>
								);
							})}
						</ul>
						{data && data.pageCount > 1 ? (
							<div className="flex items-center justify-between">
								<Button
									variant="outline"
									size="sm"
									disabled={data.page <= 1}
									onClick={() => state.setPage(data.page - 1)}
								>
									Previous
								</Button>
								<span className="text-muted-foreground text-xs">
									Page {data.page} of {data.pageCount}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={data.page >= data.pageCount}
									onClick={() => state.setPage(data.page + 1)}
								>
									Next
								</Button>
							</div>
						) : null}
					</div>

					{isWide && selected ? (
						<ReportCase key={selectedKey} group={selected} />
					) : null}
				</div>
			)}

			<Sheet
				open={!isWide && Boolean(picked)}
				onOpenChange={(open) => {
					if (!open) state.setItem(null);
				}}
			>
				<SheetContent
					side="bottom"
					className="max-h-[92dvh] overflow-y-auto p-0"
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Report details</SheetTitle>
						<SheetDescription>
							Who reported it, and what you can do about it.
						</SheetDescription>
					</SheetHeader>
					{picked ? (
						<ReportCase
							key={itemKey(picked.target, picked.targetId)}
							group={picked}
						/>
					) : null}
				</SheetContent>
			</Sheet>
		</div>
	);
}
