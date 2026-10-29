"use client";

import type { EndReadingSessionOutput } from "@bbrc/api/modules/reading-session/reading-session.schema";
import { formatDuration } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Flame, Share2 } from "lucide-react";

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-baseline justify-between gap-4 border-border border-b py-2.5 last:border-b-0">
			<dt className="text-muted-foreground text-sm">{label}</dt>
			<dd className="font-medium tabular-nums">{value}</dd>
		</div>
	);
}

/** What the session added up to, and what to do next. */
export function SessionSummary({
	summary,
	seconds,
	notice,
	byPage,
	bookTitle,
	onShare,
	onAgain,
	onDone,
}: {
	summary: EndReadingSessionOutput | null;
	seconds: number;
	notice: string | null;
	byPage: boolean;
	bookTitle: string;
	onShare: () => void;
	onAgain: () => void;
	onDone: () => void;
}) {
	const pagesGained =
		summary && byPage && summary.pageFrom != null && summary.pageTo != null
			? summary.pageTo - summary.pageFrom
			: null;
	const percentGained = summary
		? summary.percentTo - summary.percentFrom
		: null;

	return (
		<section
			className="flex w-full max-w-sm flex-col gap-6"
			aria-label="Session summary"
		>
			<div className="flex flex-col items-center gap-1 text-center">
				<p className="text-muted-foreground text-sm">You read</p>
				<p className="font-heading font-semibold text-6xl tabular-nums leading-none tracking-tight">
					{formatDuration(seconds)}
				</p>
				<p className="text-muted-foreground text-sm">{bookTitle}</p>
			</div>

			{notice ? (
				<p className="border border-warning/30 bg-warning/10 p-3 text-sm text-warning-ink">
					{notice}
				</p>
			) : null}

			{summary ? (
				<dl className="border border-border px-4">
					{pagesGained != null ? (
						<Row
							label="Pages"
							value={pagesGained > 0 ? `+${pagesGained}` : "No change"}
						/>
					) : null}
					{percentGained != null ? (
						<Row
							label="Book"
							value={`${summary.percentTo}%${percentGained > 0 ? ` (+${percentGained})` : ""}`}
						/>
					) : null}
					{summary.streakDays > 0 ? (
						<Row
							label="Reading streak"
							value={`${summary.streakDays} ${summary.streakDays === 1 ? "day" : "days"}`}
						/>
					) : null}
				</dl>
			) : null}

			{summary && summary.streakDays > 1 ? (
				<p className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm">
					<Flame className="size-4 text-warning" aria-hidden />
					{summary.streakDays} days in a row. Nice.
				</p>
			) : null}

			<div className="flex flex-col gap-2">
				<Button type="button" className="h-12" onClick={onDone}>
					Done
				</Button>
				<div className="grid grid-cols-2 gap-2">
					<Button
						type="button"
						variant="outline"
						className="h-11"
						onClick={onShare}
					>
						<Share2 data-icon="inline-start" aria-hidden />
						Share
					</Button>
					<Button
						type="button"
						variant="outline"
						className="h-11"
						onClick={onAgain}
					>
						Read again
					</Button>
				</div>
			</div>
		</section>
	);
}
