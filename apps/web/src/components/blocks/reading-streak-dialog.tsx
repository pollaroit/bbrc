"use client";

import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { READING_STREAK_TOOLTIP } from "@bbrc/shared";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import type { Route } from "next";
import Link from "next/link";
import { useMemo } from "react";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

type Streak = GetUserByUsernameOutput["readingStreak"];
type StreakSitting = Streak["sittings"][number];

const progressLabels: Record<StreakSitting["progress"], string> = {
	not_started: "Not started",
	in_progress: "Reading",
	completed: "Completed",
	dnf: "Did not finish",
};

function streakSetsEqual(a: readonly string[], b: readonly string[]) {
	if (a.length !== b.length) {
		return false;
	}
	const setB = new Set(b);
	return a.every((slug) => setB.has(slug));
}

function SittingStreakList({
	items,
	highlight,
}: {
	items: StreakSitting[];
	highlight: "current" | "best" | "history";
}) {
	if (items.length === 0) {
		return null;
	}

	return (
		<ul className="divide-y divide-border border border-border">
			{items.map((sitting) => (
				<li key={sitting.slug}>
					<Link
						href={`/sittings/${sitting.slug}` as Route}
						className="flex flex-col gap-1 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
					>
						<span className="min-w-0 font-medium text-sm leading-snug">
							{sitting.displayName}
						</span>
						<span className="flex shrink-0 flex-wrap items-center gap-2 text-muted-foreground text-xs">
							<span className="tabular-nums">
								{formatDateTime(sitting.deadline)}
							</span>
							{highlight === "history" ? (
								<span
									className={cn(
										"border border-border px-1.5 py-0.5",
										sitting.progress === "completed" &&
											"text-success-foreground",
									)}
								>
									{progressLabels[sitting.progress]}
								</span>
							) : null}
						</span>
					</Link>
				</li>
			))}
		</ul>
	);
}

type ReadingStreakDialogProps = {
	streak: Streak;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function ReadingStreakDialog({
	streak,
	open,
	onOpenChange,
}: ReadingStreakDialogProps) {
	const { currentItems, bestItems, historyItems, bestMatchesCurrent } =
		useMemo(() => {
			const currentItems = streak.sittings.filter((s) => s.inCurrentStreak);
			const bestItems = streak.sittings
				.filter((s) => s.inBestStreak)
				.toSorted(
					(a, b) =>
						new Date(b.deadline).getTime() - new Date(a.deadline).getTime(),
				);
			const currentSlugs = currentItems.map((s) => s.slug);
			const bestSlugs = bestItems.map((s) => s.slug);
			const bestMatchesCurrent =
				streak.best > 0 && streakSetsEqual(currentSlugs, bestSlugs);

			const highlighted = new Set([
				...currentSlugs,
				...(bestMatchesCurrent ? [] : bestSlugs),
			]);
			const historyItems = streak.sittings.filter(
				(s) => !highlighted.has(s.slug),
			);

			return {
				currentItems,
				bestItems,
				historyItems,
				bestMatchesCurrent,
			};
		}, [streak]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="!flex max-h-[min(90dvh,36rem)] flex-col gap-0 overflow-hidden sm:max-w-md">
				<div className="shrink-0 space-y-4 pr-6">
					<DialogHeader>
						<DialogTitle>Reading streak</DialogTitle>
						<DialogDescription>{READING_STREAK_TOOLTIP}</DialogDescription>
					</DialogHeader>

					<div className="grid grid-cols-2 gap-3">
						<div className="border border-border bg-muted/20 px-3 py-2.5">
							<p className="text-muted-foreground text-xs">Current</p>
							<p className="font-medium text-2xl tabular-nums tracking-tight">
								{streak.current}
							</p>
							<p className="text-muted-foreground text-xs">
								{streak.current === 1 ? "sitting" : "sittings"} in a row
							</p>
						</div>
						<div className="border border-border bg-muted/20 px-3 py-2.5">
							<p className="text-muted-foreground text-xs">Personal best</p>
							<p className="font-medium text-2xl tabular-nums tracking-tight">
								{streak.best}
							</p>
							<p className="text-muted-foreground text-xs">
								{streak.best === 1 ? "sitting" : "sittings"} in a row
							</p>
						</div>
					</div>
				</div>

				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-4 pr-1">
					{streak.current > 0 ? (
						<section className="space-y-2">
							<h3 className="font-medium text-sm">
								Current streak
								{bestMatchesCurrent ? (
									<span className="font-normal text-muted-foreground">
										{" "}
										· personal best
									</span>
								) : null}
							</h3>
							<SittingStreakList items={currentItems} highlight="current" />
						</section>
					) : null}

					{streak.best > 0 && !bestMatchesCurrent ? (
						<section className="space-y-2">
							<h3 className="font-medium text-sm">Best streak</h3>
							<SittingStreakList items={bestItems} highlight="best" />
						</section>
					) : null}

					{streak.current === 0 && streak.best === 0 ? (
						<p className="text-muted-foreground text-sm">
							Finish consecutive club sittings as{" "}
							<span className="text-foreground">Completed</span> to start a
							streak.
						</p>
					) : null}

					{historyItems.length > 0 ? (
						<section className="space-y-2">
							<h3 className="font-medium text-sm">Other finished sittings</h3>
							<p className="text-muted-foreground text-xs">
								These did not extend your current or best run.
							</p>
							<SittingStreakList items={historyItems} highlight="history" />
						</section>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
