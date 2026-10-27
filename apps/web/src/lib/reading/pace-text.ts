import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";
import type { Formatters } from "@bbrc/i18n";
import { formatPaceAmount } from "@bbrc/shared";
import { clubTimeZone } from "@/lib/club-timezone";

export type PaceTone = "good" | "warn" | "muted";

export type PaceText = {
	text: string;
	tone: PaceTone;
};

const formatDay = (f: Formatters, date: Date | string) =>
	f.dateWith(date, { month: "short", day: "numeric", timeZone: clubTimeZone });

/**
 * One plain sentence about how a reading is going against its deadline, or
 * null when there is nothing useful to say (finished, or no pace yet and no
 * deadline). Shared by the book page strip and the home Reading card.
 *
 * - ahead:     "At this pace you finish on Oct 29, 4 days before the deadline."
 * - on track:  "At this pace you finish right around the deadline (Oct 29)."
 * - behind:    "You need 23 pages a day to make it."
 * - past:      "Past the deadline."
 * - no deadline: "At this pace you finish on Oct 29."
 */
export function paceText(
	pace: ReadingItem["pace"],
	f: Formatters,
): PaceText | null {
	if (!pace || pace.status === "done") return null;

	const need =
		pace.perDayNeeded != null
			? formatPaceAmount(pace.perDayNeeded, pace.unit)
			: null;

	switch (pace.status) {
		case "ahead": {
			if (!pace.projectedFinish) return null;
			const early = Math.max(1, pace.daysEarly ?? 1);
			return {
				tone: "good",
				text: `At this pace you finish on ${formatDay(f, pace.projectedFinish)}, ${early} ${early === 1 ? "day" : "days"} before the deadline.`,
			};
		}
		case "on_track":
			return {
				tone: "good",
				text: pace.projectedFinish
					? `At this pace you finish right around the deadline (${formatDay(f, pace.projectedFinish)}).`
					: "You are on track for the deadline.",
			};
		case "behind":
			return {
				tone: "warn",
				text: need
					? `You need ${need} a day to make it.`
					: "You are behind the deadline.",
			};
		case "past_deadline":
			return { tone: "warn", text: "Past the deadline." };
		case "no_data":
			return need
				? {
						tone: "muted",
						text: `You need ${need} a day to make the deadline.`,
					}
				: null;
		case "no_deadline":
			return pace.projectedFinish
				? {
						tone: "muted",
						text: `At this pace you finish on ${formatDay(f, pace.projectedFinish)}.`,
					}
				: null;
		default:
			return null;
	}
}

/** Token classes for a tone (text colour only). */
export const paceToneClass: Record<PaceTone, string> = {
	good: "text-success-ink",
	warn: "text-warning-ink",
	muted: "text-muted-foreground",
};
