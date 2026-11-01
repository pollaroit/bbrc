"use client";

import type { ReportGroup } from "@bbrc/api/modules/report/report.schema";
import { REPORT_REASON_LABELS, REPORT_TARGET_LABELS } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { RelativeTime } from "@/components/blocks/relative-time";
import { cn } from "@/lib/utils";
import { ReportKindIcon } from "./report-kind";

/** One row of the queue. The number is how many members reported it. */
export function ReportListItem({
	group,
	selected,
	onSelect,
}: {
	group: ReportGroup;
	selected: boolean;
	onSelect: () => void;
}) {
	const open = group.status === "open";
	const topReason = group.reasons[0];
	const reasonText = topReason
		? group.reasons.length > 1
			? `${REPORT_REASON_LABELS[topReason.reason]} and ${group.reasons.length - 1} more`
			: REPORT_REASON_LABELS[topReason.reason]
		: null;

	return (
		<Button
			type="button"
			variant="ghost"
			aria-current={selected ? "true" : undefined}
			onClick={onSelect}
			className={cn(
				"h-auto w-full justify-start gap-3 whitespace-normal border-0 border-border border-l-2 border-l-transparent px-3 py-3 text-left font-normal",
				selected && "border-l-foreground bg-muted",
			)}
		>
			<span
				className={cn(
					"flex size-9 shrink-0 flex-col items-center justify-center border font-semibold text-sm tabular-nums leading-none",
					open
						? "border-warning/40 bg-warning/10 text-warning-ink"
						: "border-border text-muted-foreground",
				)}
				title={`${group.count} ${group.count === 1 ? "report" : "reports"}`}
			>
				{group.count}
				<span className="sr-only">
					{group.count === 1 ? "report" : "reports"}
				</span>
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span
					className={cn(
						"truncate font-medium text-sm",
						!group.live && "text-muted-foreground line-through",
					)}
				>
					{group.title ?? "Removed content"}
				</span>
				<span className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
					<ReportKindIcon kind={group.target} className="size-3 shrink-0" />
					<span className="shrink-0">{REPORT_TARGET_LABELS[group.target]}</span>
					{reasonText ? <span className="truncate">{reasonText}</span> : null}
				</span>
				<span className="text-2xs text-muted-foreground">
					Latest <RelativeTime date={group.latestAt} />
				</span>
			</span>
		</Button>
	);
}
