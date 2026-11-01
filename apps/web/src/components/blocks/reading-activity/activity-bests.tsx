"use client";

import type { ActivityOverviewOutput } from "@bbrc/api/modules/reading-activity/reading-activity.schema";
import { formatActivityDuration, formatSessionClock } from "@bbrc/shared";
import { CardContent } from "@bbrc/ui/components/card";
import {
	BookMarked,
	CalendarCheck,
	CalendarRange,
	Files,
	Flame,
	Gauge,
	Layers,
	type LucideIcon,
	Moon,
	Rows3,
	Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import { ClickCard } from "./click-card";
import {
	formatDayLabel,
	formatDayRange,
	formatMonthLabel,
	formatSpeed,
	monthEndKey,
	plural,
} from "./format";
import type { ActivityStateApi } from "./use-activity-state";

type Full = Extract<ActivityOverviewOutput, { access: "full" }>;

type Record = {
	key: string;
	icon: LucideIcon;
	label: string;
	value: string;
	detail: ReactNode;
	/** What choosing the card filters every view down to. */
	apply: () => void;
	applyLabel: string;
};

/**
 * The member's records, each a card. Choosing one shows only what produced it,
 * in every view (a day, a week, a month, a streak or a book).
 */
export function ActivityBests({
	bests,
	api,
}: {
	bests: Full["bests"];
	api: ActivityStateApi;
}) {
	const { setState } = api;
	const day = (key: string) =>
		void setState({ from: key, to: key, range: "all" });
	const span = (from: string, to: string) =>
		void setState({ from, to, range: "all" });

	const records: Record[] = [];
	if (bests.longestSession) {
		const r = bests.longestSession;
		records.push({
			key: "longest",
			icon: Trophy,
			label: "Longest session",
			value: formatSessionClock(r.seconds),
			detail: `${r.bookTitle}, ${formatDayLabel(r.day)}`,
			apply: () => day(r.day),
			applyLabel: `Show ${formatDayLabel(r.day)}`,
		});
	}
	if (bests.mostPagesSession) {
		const r = bests.mostPagesSession;
		records.push({
			key: "pages-session",
			icon: Files,
			label: "Most pages in a session",
			value: plural(r.pages, "page"),
			detail: `${r.bookTitle}, ${formatDayLabel(r.day)}`,
			apply: () => day(r.day),
			applyLabel: `Show ${formatDayLabel(r.day)}`,
		});
	}
	if (bests.fastestSpeed) {
		const r = bests.fastestSpeed;
		records.push({
			key: "fastest",
			icon: Gauge,
			label: "Fastest reading",
			value: formatSpeed(r.speed),
			detail: `${r.bookTitle}, ${formatDayLabel(r.day)}`,
			apply: () => day(r.day),
			applyLabel: `Show ${formatDayLabel(r.day)}`,
		});
	}
	if (bests.bestDay) {
		const r = bests.bestDay;
		records.push({
			key: "best-day",
			icon: CalendarCheck,
			label: "Best day",
			value: formatActivityDuration(r.seconds),
			detail: formatDayLabel(r.day),
			apply: () => day(r.day),
			applyLabel: `Show ${formatDayLabel(r.day)}`,
		});
	}
	if (bests.mostPagesDay) {
		const r = bests.mostPagesDay;
		records.push({
			key: "pages-day",
			icon: Layers,
			label: "Most pages in a day",
			value: plural(r.pages, "page"),
			detail: formatDayLabel(r.day),
			apply: () => day(r.day),
			applyLabel: `Show ${formatDayLabel(r.day)}`,
		});
	}
	if (bests.mostSessionsDay) {
		const r = bests.mostSessionsDay;
		records.push({
			key: "sessions-day",
			icon: Rows3,
			label: "Most sessions in a day",
			value: String(r.sessions),
			detail: formatDayLabel(r.day),
			apply: () => day(r.day),
			applyLabel: `Show ${formatDayLabel(r.day)}`,
		});
	}
	if (bests.bestWeek) {
		const r = bests.bestWeek;
		records.push({
			key: "best-week",
			icon: CalendarRange,
			label: "Best week",
			value: formatActivityDuration(r.seconds),
			detail: formatDayRange(r.from, r.to),
			apply: () => span(r.from, r.to),
			applyLabel: `Show ${formatDayRange(r.from, r.to)}`,
		});
	}
	if (bests.bestMonth) {
		const r = bests.bestMonth;
		records.push({
			key: "best-month",
			icon: Moon,
			label: "Best month",
			value: formatActivityDuration(r.seconds),
			detail: formatMonthLabel(r.month),
			apply: () => span(`${r.month}-01`, monthEndKey(r.month)),
			applyLabel: `Show ${formatMonthLabel(r.month)}`,
		});
	}
	if (bests.longestStreak) {
		const r = bests.longestStreak;
		records.push({
			key: "streak",
			icon: Flame,
			label: "Longest streak",
			value: plural(r.days, "day"),
			detail: formatDayRange(r.from, r.to),
			apply: () => span(r.from, r.to),
			applyLabel: `Show ${formatDayRange(r.from, r.to)}`,
		});
	}
	if (bests.topBook) {
		const r = bests.topBook;
		records.push({
			key: "top-book",
			icon: BookMarked,
			label: "Most time on one book",
			value: formatActivityDuration(r.seconds),
			detail: r.title,
			apply: () => void setState({ books: [r.slug] }),
			applyLabel: `Show only ${r.title}`,
		});
	}

	if (records.length === 0) return null;

	return (
		<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
			{records.map((record) => (
				<li key={record.key} className="flex">
					<ClickCard
						label={record.applyLabel}
						onClick={record.apply}
						className="w-full"
					>
						<CardContent className="flex flex-col gap-2">
							<span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
								<record.icon className="size-3.5" aria-hidden />
								{record.label}
							</span>
							<span className="font-heading font-semibold text-2xl tabular-nums leading-none tracking-tight">
								{record.value}
							</span>
							<span className="line-clamp-2 text-muted-foreground text-xs leading-snug">
								{record.detail}
							</span>
						</CardContent>
					</ClickCard>
				</li>
			))}
		</ul>
	);
}
