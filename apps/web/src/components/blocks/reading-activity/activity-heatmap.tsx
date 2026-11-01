"use client";

import { addDays, formatActivityDuration, weekStart } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { useEffect, useRef, useState } from "react";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { cn } from "@/lib/utils";
import { formatDayLabel, plural } from "./format";

export type HeatDay = {
	day: string;
	seconds: number;
	sessions: number;
	pages: number | null;
	books: string[];
};

export type HeatMetric = "time" | "sessions";

/** Five steps, lightest to darkest. The hover colour is repeated so a cell keeps its step under the pointer. */
const LEVELS = [
	"bg-muted hover:bg-muted",
	"bg-primary/25 hover:bg-primary/25",
	"bg-primary/50 hover:bg-primary/50",
	"bg-primary/75 hover:bg-primary/75",
	"bg-primary hover:bg-primary",
] as const;

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

/** The step of a day among the days that have any (quartiles); 0 means none. */
function stepper(values: number[]): (value: number) => number {
	const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
	const at = (q: number) =>
		sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
	const [q1, q2, q3] = [at(0.25), at(0.5), at(0.75)];
	return (v) => (v <= 0 ? 0 : v <= q1 ? 1 : v <= q2 ? 2 : v <= q3 ? 3 : 4);
}

/**
 * Every day of the last 12 months as a cell, darker for more reading. Hover or
 * focus a day to read what happened; press it to show only that day in every
 * view (press again to undo). Arrow keys move between days.
 */
export function ActivityHeatmap({
	days,
	today,
	metric,
	onMetric,
	selected,
	onPick,
}: {
	days: HeatDay[];
	today: string;
	metric: HeatMetric;
	onMetric: (metric: HeatMetric) => void;
	/** The days a date filter covers, if any. */
	selected: { from: string; to: string } | null;
	onPick: (day: string) => void;
}) {
	const scroller = useRef<HTMLDivElement>(null);
	const [active, setActive] = useState<string | null>(null);
	useEffect(() => {
		const el = scroller.current;
		if (el) el.scrollLeft = el.scrollWidth;
	}, []);

	const byDay = new Map(days.map((d) => [d.day, d]));
	const heatValue = (d: HeatDay | undefined) =>
		d ? (metric === "time" ? d.seconds : d.sessions) : 0;
	const step = stepper(days.map(heatValue));
	const first = weekStart(addDays(today, -364));
	const weeks: string[][] = [];
	for (let start = first; start <= today; start = addDays(start, 7)) {
		weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
	}

	const inSelection = (day: string) =>
		selected != null && day >= selected.from && day <= selected.to;
	// One cell is reachable with Tab; the arrow keys do the rest.
	const tabStop =
		active ?? (selected?.to && selected.to <= today ? selected.to : today);

	const shown =
		active ?? (selected?.from === selected?.to ? selected?.from : null);
	const shownDay = shown ? byDay.get(shown) : undefined;

	const onKeyDown = (event: React.KeyboardEvent<HTMLFieldSetElement>) => {
		const delta =
			event.key === "ArrowDown"
				? 1
				: event.key === "ArrowUp"
					? -1
					: event.key === "ArrowRight"
						? 7
						: event.key === "ArrowLeft"
							? -7
							: 0;
		if (!delta) return;
		const from = (event.target as HTMLElement).dataset.day;
		if (!from) return;
		const next = addDays(from, delta);
		if (next < first || next > today) return;
		event.preventDefault();
		scroller.current
			?.querySelector<HTMLElement>(`[data-day="${next}"]`)
			?.focus();
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Reading by day</CardTitle>
				<CardDescription>
					The last 12 months. Choose a day to see only that day.
				</CardDescription>
				<CardAction>
					<SegmentedControl<HeatMetric>
						label="What the colours show"
						value={metric}
						onChange={onMetric}
						options={[
							{ id: "time", label: "Time" },
							{ id: "sessions", label: "Sessions" },
						]}
					/>
				</CardAction>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div ref={scroller} className="overflow-x-auto pb-1">
					<fieldset
						onKeyDown={onKeyDown}
						className="m-0 flex w-max min-w-0 gap-1 border-0 p-0"
					>
						<legend className="sr-only">
							Reading for each day over the last 12 months
						</legend>
						<div
							className="flex flex-col gap-1 pt-4 pr-1 text-3xs text-muted-foreground"
							aria-hidden
						>
							{["Mon", "", "Wed", "", "Fri", "", ""].map((label, i) => (
								<span key={i} className="h-3 leading-3">
									{label}
								</span>
							))}
						</div>
						{weeks.map((week, index) => {
							const monthStart = week.find((d) => d.endsWith("-01"));
							return (
								<div key={week[0]} className="flex flex-col gap-1">
									<span
										className="h-3 w-3 overflow-visible whitespace-nowrap text-3xs text-muted-foreground leading-3"
										aria-hidden
									>
										{monthStart || index === 0
											? MONTHS[Number((monthStart ?? week[0])?.slice(5, 7)) - 1]
											: ""}
									</span>
									{week.map((day) => {
										if (day > today) {
											return <span key={day} className="size-3" aria-hidden />;
										}
										const entry = byDay.get(day);
										const level = step(heatValue(entry));
										return (
											<Button
												key={day}
												type="button"
												size="icon-xs"
												data-day={day}
												tabIndex={tabStop === day ? 0 : -1}
												aria-label={`${formatDayLabel(day)}: ${
													entry
														? `${formatActivityDuration(entry.seconds)} in ${plural(entry.sessions, "session")}`
														: "no reading"
												}`}
												aria-pressed={inSelection(day)}
												onMouseEnter={() => setActive(day)}
												onMouseLeave={() => setActive(null)}
												onFocus={() => setActive(day)}
												onBlur={() => setActive(null)}
												onClick={() => onPick(day)}
												className={cn(
													"size-3 min-w-0 p-0",
													LEVELS[level],
													inSelection(day) && "ring-2 ring-foreground",
												)}
											/>
										);
									})}
								</div>
							);
						})}
					</fieldset>
				</div>
				<div className="flex items-center justify-end gap-1.5 text-3xs text-muted-foreground">
					Less
					{LEVELS.map((level) => (
						<span key={level} className={cn("size-3", level.split(" ")[0])} />
					))}
					More
				</div>
			</CardContent>
			<CardFooter className="min-h-16 flex-col items-start gap-1">
				{shown ? (
					<>
						<p className="font-heading font-medium text-sm">
							{formatDayLabel(shown)}
						</p>
						{shownDay ? (
							<>
								<p className="text-sm tabular-nums">
									{formatActivityDuration(shownDay.seconds)} in{" "}
									{plural(shownDay.sessions, "session")}
									{shownDay.pages != null && shownDay.pages > 0
										? `, ${plural(shownDay.pages, "page")}`
										: ""}
								</p>
								<p className="text-muted-foreground text-xs">
									{shownDay.books.join(", ")}
								</p>
							</>
						) : (
							<p className="text-muted-foreground text-sm">No reading.</p>
						)}
					</>
				) : (
					<p className="text-muted-foreground text-sm">
						Hover or focus a day to see what you read. Arrow keys move between
						days.
					</p>
				)}
			</CardFooter>
		</Card>
	);
}
