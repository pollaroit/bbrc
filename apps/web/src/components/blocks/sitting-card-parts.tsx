"use client";

import type { Formatters } from "@bbrc/i18n";
import type { ProgressSchema } from "@bbrc/schemas";
import type { z } from "zod";
import { ClubDateTime } from "@/components/blocks/club-date-time";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";

type Progress = z.infer<typeof ProgressSchema>;

/** Card tint by the member's progress; only meaningful once reading has begun. */
export const progressCardClassName: Record<Progress, string> = {
	not_started: "border-warning/40 bg-warning/5",
	in_progress: "border-primary/40 bg-primary/5",
	completed: "border-success/40 bg-success/5",
	dnf: "border-destructive/40 bg-destructive/5",
};

export function VotingProgress({
	poll,
}: {
	poll: { createdAt: Date; deadline: Date };
}) {
	const start = poll.createdAt.getTime();
	const end = poll.deadline.getTime();
	const now = Date.now();
	const percent =
		end > start
			? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
			: 100;

	return (
		<div className="flex flex-col gap-1.5">
			<div
				className="h-1.5 border border-border bg-muted/30"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(percent)}
				aria-label="Voting time elapsed"
			>
				<div className="h-full bg-warning" style={{ width: `${percent}%` }} />
			</div>
			<p className="text-muted-foreground text-xs">
				Voting closes <ClubDateTime value={poll.deadline} /> (
				{formatRelativeTime(poll.deadline)})
			</p>
		</div>
	);
}

function formatShortDate(f: Formatters, date: Date, withYear: boolean) {
	return f.dateWith(date, {
		month: "short",
		day: "numeric",
		...(withYear ? { year: "numeric" } : {}),
	});
}

/** Start-to-deadline bar for reading and finished sittings. */
export function ReadingTimeline({
	start,
	end,
	finished,
}: {
	start: Date;
	end: Date;
	finished: boolean;
}) {
	const f = useFormatters();
	const now = Date.now();
	const span = end.getTime() - start.getTime();
	const percent = finished
		? 100
		: span > 0
			? Math.min(100, Math.max(0, ((now - start.getTime()) / span) * 100))
			: 100;
	const overdue = !finished && end.getTime() < now;
	// Show years when the span crosses years or is not in the current year.
	const withYear =
		start.getFullYear() !== end.getFullYear() ||
		end.getFullYear() !== new Date().getFullYear();

	return (
		<div className="flex flex-col gap-1.5">
			<div
				className="h-1.5 border border-border bg-muted/30"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(percent)}
				aria-label="Sitting time elapsed"
			>
				<div
					className={cn(
						"h-full",
						finished
							? "bg-foreground/30"
							: overdue
								? "bg-destructive"
								: "bg-primary",
					)}
					style={{ width: `${percent}%` }}
				/>
			</div>
			<div className="flex items-baseline justify-between gap-2 text-muted-foreground text-xs tabular-nums">
				<span>{formatShortDate(f, start, withYear)}</span>
				{finished ? null : (
					<span className={cn(overdue && "text-destructive")}>
						Due {formatRelativeTime(end)}
					</span>
				)}
				<span>{formatShortDate(f, end, withYear)}</span>
			</div>
		</div>
	);
}
