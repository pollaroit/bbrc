"use client";

import type { EndReadingSessionOutput } from "@bbrc/api/modules/reading-session/reading-session.schema";
import { formatDuration } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { BookOpen, Clock, Flame, RotateCcw, Share2 } from "lucide-react";
import type { ComponentType } from "react";

function Tile({
	icon: Icon,
	label,
	value,
	hint,
}: {
	icon: ComponentType<{ className?: string }>;
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<div className="flex flex-col gap-1 border border-border bg-card p-3">
			<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
				<Icon className="size-3.5" />
				{label}
			</span>
			<span className="font-heading font-semibold text-2xl tabular-nums leading-none">
				{value}
			</span>
			{hint ? (
				<span className="text-muted-foreground text-xs tabular-nums">
					{hint}
				</span>
			) : null}
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
			? Math.max(0, summary.pageTo - summary.pageFrom)
			: null;
	const percentGained = summary
		? Math.max(0, summary.percentTo - summary.percentFrom)
		: null;

	return (
		<section
			className="flex w-full max-w-md flex-col gap-5"
			aria-label="Session summary"
		>
			<div className="flex flex-col items-center gap-2 text-center">
				<p className="text-muted-foreground text-sm">Nice reading. You read</p>
				<p className="font-heading font-semibold text-7xl tabular-nums leading-none tracking-tight">
					{formatDuration(seconds)}
				</p>
				<p className="max-w-full truncate text-muted-foreground text-sm">
					{bookTitle}
				</p>
			</div>

			{notice ? (
				<p className="border border-warning/30 bg-warning/10 p-3 text-sm text-warning-ink">
					{notice}
				</p>
			) : null}

			{summary ? (
				<div className="grid grid-cols-2 gap-2">
					<Tile icon={Clock} label="Time" value={formatDuration(seconds)} />
					<Tile
						icon={BookOpen}
						label={pagesGained != null ? "Pages" : "Progress"}
						value={
							pagesGained != null
								? pagesGained > 0
									? `+${pagesGained}`
									: "0"
								: `${summary.percentTo}%`
						}
						hint={
							pagesGained != null
								? `Now ${summary.percentTo}% through`
								: percentGained
									? `+${percentGained}%`
									: undefined
						}
					/>
					{summary.streakDays > 0 ? (
						<div className="col-span-2">
							<Tile
								icon={Flame}
								label="Reading streak"
								value={`${summary.streakDays} ${summary.streakDays === 1 ? "day" : "days"}`}
								hint={
									summary.streakDays > 1
										? "In a row. Keep it going."
										: undefined
								}
							/>
						</div>
					) : null}
				</div>
			) : null}

			<div className="flex flex-col gap-2">
				<Button type="button" className="h-14 text-base" onClick={onDone}>
					Done
				</Button>
				<div className="grid grid-cols-2 gap-2">
					<Button
						type="button"
						variant="outline"
						className="h-12"
						onClick={onShare}
					>
						<Share2 data-icon="inline-start" aria-hidden />
						Share
					</Button>
					<Button
						type="button"
						variant="outline"
						className="h-12"
						onClick={onAgain}
					>
						<RotateCcw data-icon="inline-start" aria-hidden />
						Read again
					</Button>
				</div>
			</div>
		</section>
	);
}
