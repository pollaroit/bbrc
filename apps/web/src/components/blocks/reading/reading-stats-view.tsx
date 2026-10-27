"use client";

import type { Formatters } from "@bbrc/i18n";
import { clubDayKey, dayKeysBetween } from "@bbrc/shared";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { clubTimeZone } from "@/lib/club-timezone";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const ReadingStatsChart = dynamic(
	() =>
		import("@/components/blocks/reading/reading-stats-chart").then(
			(mod) => mod.ReadingStatsChart,
		),
	{ ssr: false, loading: () => <Skeleton className="h-52 w-full" /> },
);

const DAY = 86_400_000;
const HEATMAP_DAYS = 120;

function Stat({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<div className="flex flex-col gap-1 border border-border p-3">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="font-semibold text-2xl tabular-nums tracking-tight">
				{value}
			</span>
			{hint ? (
				<span className="text-muted-foreground text-xs">{hint}</span>
			) : null}
		</div>
	);
}

/** Last 120 days as weeks of seven (Monday first); a darker cell is a busier day. */
function ActivityHeatmap({
	activity,
}: {
	activity: { day: string; updates: number }[];
}) {
	const { weeks, max } = useMemo(() => {
		const counts = new Map(activity.map((entry) => [entry.day, entry.updates]));
		const today = new Date();
		const from = clubDayKey(
			new Date(today.getTime() - (HEATMAP_DAYS - 1) * DAY),
			clubTimeZone,
		);
		const keys = dayKeysBetween(from, clubDayKey(today, clubTimeZone));
		// Pad the front so the first column starts on a Monday.
		const firstWeekday = (new Date(`${keys[0]}T00:00:00Z`).getUTCDay() + 6) % 7;
		const cells: ({ day: string; updates: number } | null)[] = [
			...Array.from({ length: firstWeekday }, () => null),
			...keys.map((day) => ({ day, updates: counts.get(day) ?? 0 })),
		];
		const columns: (typeof cells)[] = [];
		for (let i = 0; i < cells.length; i += 7)
			columns.push(cells.slice(i, i + 7));
		return {
			weeks: columns,
			max: Math.max(1, ...activity.map((entry) => entry.updates)),
		};
	}, [activity]);

	return (
		<div className="overflow-x-auto pb-1">
			<div
				className="flex gap-1"
				role="img"
				aria-label="Days you logged reading progress in the last 120 days"
			>
				{weeks.map((column, columnIndex) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: a fixed calendar grid
					<div key={columnIndex} className="flex flex-col gap-1">
						{Array.from({ length: 7 }, (_, row) => {
							const cell = column[row];
							if (!cell) return <span key={row} className="size-3" />;
							return (
								<span
									key={row}
									title={`${cell.day}: ${cell.updates} ${cell.updates === 1 ? "update" : "updates"}`}
									className={cn(
										"size-3",
										cell.updates === 0 ? "bg-muted" : "bg-primary",
									)}
									style={
										cell.updates === 0
											? undefined
											: { opacity: 0.25 + 0.75 * (cell.updates / max) }
									}
								/>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}

const monthLabel = (f: Formatters, month: string) =>
	f.dateWith(`${month}-01T00:00:00Z`, { month: "short", timeZone: "UTC" });

/** Your reading numbers: finish times, pace, streaks, books per month and history. */
export function ReadingStatsView() {
	const f = useFormatters();
	const stats = useQuery({
		...orpc.reading.stats.queryOptions(),
		staleTime: 60_000,
	});

	const monthly = useMemo(() => {
		const counts = new Map(
			(stats.data?.perMonth ?? []).map((entry) => [entry.month, entry.count]),
		);
		const now = new Date();
		return Array.from({ length: 12 }, (_, index) => {
			const date = new Date(
				Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - index), 1),
			);
			const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
			return {
				month,
				label: monthLabel(f, month),
				count: counts.get(month) ?? 0,
			};
		});
	}, [stats.data, f]);

	if (stats.isPending) {
		return (
			<div className="flex flex-col gap-4" aria-hidden>
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-52 w-full" />
			</div>
		);
	}
	if (stats.isError || !stats.data) {
		return (
			<p className="border border-border border-dashed p-6 text-center text-muted-foreground text-sm">
				Could not load your reading stats. Try again in a moment.
			</p>
		);
	}

	const data = stats.data;
	const empty = data.finishedCount === 0 && data.activity.length === 0;

	if (empty) {
		return (
			<div className="flex flex-col items-center gap-2 border border-border border-dashed px-6 py-12 text-center">
				<p className="font-medium">Nothing to show yet</p>
				<p className="max-w-sm text-muted-foreground text-sm">
					Start a book with "I'm currently reading" and update your progress.
					Your pace and streaks appear here.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<section
				aria-label="Reading numbers"
				className="grid grid-cols-2 gap-3 md:grid-cols-4"
			>
				<Stat
					label="Books finished"
					value={String(data.finishedCount)}
					hint={
						data.pagesFinished > 0
							? `${f.number(data.pagesFinished)} pages`
							: undefined
					}
				/>
				<Stat
					label="Average time to finish"
					value={
						data.averageDaysToFinish != null
							? `${data.averageDaysToFinish} days`
							: "—"
					}
				/>
				<Stat
					label="Pages per day"
					value={data.pagesPerDay != null ? String(data.pagesPerDay) : "—"}
					hint="Over finished books"
				/>
				<Stat
					label="Current streak"
					value={`${data.currentStreak} ${data.currentStreak === 1 ? "day" : "days"}`}
					hint={`Longest: ${data.longestStreak} ${data.longestStreak === 1 ? "day" : "days"}`}
				/>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-base tracking-tight">
					Books finished per month
				</h2>
				<ReadingStatsChart data={monthly} />
			</section>

			<section className="flex flex-col gap-3">
				<div className="flex items-baseline justify-between gap-3">
					<h2 className="font-semibold text-base tracking-tight">
						Reading days
					</h2>
					<span className="text-muted-foreground text-xs">Last 120 days</span>
				</div>
				<ActivityHeatmap activity={data.activity} />
			</section>

			{data.finished.length > 0 ? (
				<section className="flex flex-col gap-3">
					<h2 className="font-semibold text-base tracking-tight">Finished</h2>
					<ul className="divide-y divide-border border border-border">
						{data.finished.map((row) => {
							const src = bookCoverUrl(row.book.coverId, "M");
							return (
								<li
									key={`${row.book.slug}-${row.finishedAt.toString()}`}
									className="flex items-center gap-3 p-3"
								>
									<span className="relative block aspect-2/3 w-9 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
										{src ? (
											<Image
												src={src}
												alt=""
												fill
												className="object-cover"
												sizes="36px"
											/>
										) : (
											<BookOpen
												className="absolute inset-0 m-auto size-4 text-muted-foreground"
												aria-hidden
											/>
										)}
									</span>
									<div className="min-w-0 flex-1">
										<Link
											href={`/books/${row.book.slug}` as Route}
											className="line-clamp-1 font-medium text-sm hover:underline"
										>
											{row.book.title}
										</Link>
										<p className="truncate text-muted-foreground text-xs">
											{formatBookAuthors(row.book.authors)}
										</p>
									</div>
									<div className="shrink-0 text-end text-xs tabular-nums">
										<p className="font-medium">
											{row.days} {row.days === 1 ? "day" : "days"}
										</p>
										{row.totalPages ? (
											<p className="text-muted-foreground">
												{row.totalPages} pages
											</p>
										) : null}
									</div>
								</li>
							);
						})}
					</ul>
				</section>
			) : null}
		</div>
	);
}
