import { formatReadingEstimate, planReading } from "@bbrc/shared";
import { clubTimeZone } from "@/lib/club-timezone";

/**
 * "~12 days 8 hours reading time" for a book of `pages`, if reading starts
 * when voting ends. An estimate: the page count or the start date can change.
 */
export function readingEstimateLabel(
	pages: number,
	startsAt: Date | string,
): string | null {
	const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
	if (!(pages > 0) || Number.isNaN(start.getTime())) {
		return null;
	}

	return formatReadingEstimate(
		planReading(pages, start, clubTimeZone).elapsedDays,
	);
}
