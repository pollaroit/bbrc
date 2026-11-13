/**
 * Small derived facts for a book's About page. Pure, so they are tested
 * without a database.
 */

/** An average print page holds about 275 words; an adult reads about 250 a minute. */
const MINUTES_PER_PAGE = 275 / 250;

export function estimateReadingMinutes(pages: number): number {
	if (!Number.isFinite(pages) || pages <= 0) return 0;
	return Math.round(pages * MINUTES_PER_PAGE);
}

/** "40 min", "9 h", "9.5 h": whole minutes under an hour, half hours above. */
export function formatReadingTime(minutes: number): string {
	if (minutes <= 0) return "";
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.round(minutes / 30) / 2;
	return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

export type LengthComparison = {
	/** `longer`: this book is longer than `percent` of the others. */
	direction: "longer" | "shorter";
	percent: number;
};

/**
 * How this book's length sits among the others in the library. Needs a few
 * books to mean anything; ties count for neither side.
 */
export function compareLength(
	shorterBooks: number,
	longerBooks: number,
	totalOthers: number,
): LengthComparison | null {
	if (totalOthers < 5) return null;
	if (shorterBooks >= longerBooks) {
		return {
			direction: "longer",
			percent: Math.round((shorterBooks / totalOthers) * 100),
		};
	}
	return {
		direction: "shorter",
		percent: Math.round((longerBooks / totalOthers) * 100),
	};
}
