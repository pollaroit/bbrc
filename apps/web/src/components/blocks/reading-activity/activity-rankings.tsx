"use client";

import type { ActivityOverviewOutput } from "@bbrc/api/modules/reading-activity/reading-activity.schema";
import { addDays, formatActivityDuration } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { useState } from "react";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import {
	formatDayLabel,
	formatMonthLabel,
	formatWeekLabel,
	monthEndKey,
	plural,
} from "./format";
import { Cover } from "./session-card";
import {
	type ActivityStateApi,
	RANK_TABS,
	type RankTab,
} from "./use-activity-state";

type Full = Extract<ActivityOverviewOutput, { access: "full" }>;
type Row = Full["rankings"]["days"][number] & { coverId?: number | null };

const TAB_LABELS: Record<RankTab, string> = {
	books: "Books",
	days: "Days",
	weeks: "Weeks",
	months: "Months",
	weekdays: "Weekdays",
	parts: "Time of day",
};

/**
 * Ordered lists of what took the most time. A row's bar is its share of the
 * time; choosing a row makes it the global filter, so the grid and the rest of
 * the stats follow.
 */
export function ActivityRankings({
	rankings,
	api,
}: {
	rankings: Full["rankings"];
	api: ActivityStateApi;
}) {
	const [all, setAll] = useState(false);
	const tabs = RANK_TABS.filter(
		(tab) => tab !== "parts" || rankings.dayParts != null,
	);
	const tab = tabs.includes(api.state.rank) ? api.state.rank : "books";
	const rows: Row[] =
		tab === "parts" ? (rankings.dayParts ?? []) : rankings[tab];
	const shown = all ? rows : rows.slice(0, 5);

	const label = (row: Row) =>
		tab === "days"
			? formatDayLabel(row.key)
			: tab === "weeks"
				? formatWeekLabel(row.key)
				: tab === "months"
					? formatMonthLabel(row.key)
					: row.label;

	const apply = (row: Row) => {
		const { setState } = api;
		switch (tab) {
			case "books":
				return void setState({ books: [row.key] });
			case "days":
				return void setState({ from: row.key, to: row.key, range: "all" });
			case "weeks":
				return void setState({
					from: row.key,
					to: addDays(row.key, 6),
					range: "all",
				});
			case "months":
				return void setState({
					from: `${row.key}-01`,
					to: monthEndKey(row.key),
					range: "all",
				});
			case "weekdays":
				return void setState({ days: [Number(row.key)] });
			case "parts":
				return void setState({
					parts: [row.key as "morning" | "afternoon" | "evening" | "night"],
				});
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<SegmentedControl<RankTab>
				label="Ranking"
				value={tab}
				onChange={(rank) => {
					setAll(false);
					void api.setState({ rank });
				}}
				options={tabs.map((id) => ({ id, label: TAB_LABELS[id] }))}
			/>
			{rows.length === 0 ? (
				<p className="border border-border border-dashed p-6 text-center text-muted-foreground text-sm">
					Nothing to rank for these filters.
				</p>
			) : (
				<ol className="flex flex-col divide-y divide-border border border-border">
					{shown.map((row, index) => (
						<li key={row.key} className="relative">
							<span
								aria-hidden
								className="absolute inset-y-0 left-0 bg-primary/10"
								style={{ width: `${Math.max(2, row.share * 100)}%` }}
							/>
							<div className="relative flex items-center gap-3 px-3 py-2.5">
								<span className="w-5 shrink-0 text-right font-medium text-muted-foreground text-xs tabular-nums">
									{index + 1}
								</span>
								{tab === "books" ? (
									<Cover
										coverId={row.coverId ?? null}
										className="w-7"
										sizes="28px"
									/>
								) : null}
								<span className="min-w-0 flex-1 truncate font-medium text-sm">
									{label(row)}
								</span>
								<span className="shrink-0 text-right text-sm tabular-nums">
									{formatActivityDuration(row.seconds)}
									<span className="block text-muted-foreground text-xs">
										{plural(row.sessions, "session")}
										{row.pages != null && row.pages > 0
											? `, ${plural(row.pages, "page")}`
											: ""}
									</span>
								</span>
							</div>
							<Button
								type="button"
								variant="ghost"
								aria-label={`Show only ${label(row)}`}
								onClick={() => apply(row)}
								className="absolute inset-0 size-full rounded-none hover:bg-foreground/[0.03] dark:hover:bg-foreground/[0.04]"
							/>
						</li>
					))}
				</ol>
			)}
			{rows.length > 5 ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="w-fit"
					onClick={() => setAll((value) => !value)}
				>
					{all ? "Show fewer" : `Show all ${rows.length}`}
				</Button>
			) : null}
		</div>
	);
}
