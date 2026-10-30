/*
 * Audiobook progress is time: how long the recording is, and how far in the
 * member is. Percent is always derived, so pace, streaks and the sitting's
 * "ahead or behind" line keep working on percent as for any other reading.
 */

/** No recording is longer than this (seconds): 100 hours. */
export const AUDIO_MAX_SECONDS = 100 * 3600;

export function secondsFromHoursMinutes(
	hours: number,
	minutes: number,
): number {
	const total = Math.round(hours) * 3600 + Math.round(minutes) * 60;
	return Math.min(AUDIO_MAX_SECONDS, Math.max(0, total));
}

export function splitSeconds(seconds: number): {
	hours: number;
	minutes: number;
} {
	const safe = Math.max(0, Math.floor(seconds));
	return {
		hours: Math.floor(safe / 3600),
		minutes: Math.floor((safe % 3600) / 60),
	};
}

/** "3 h 20 min", "45 min", "2 h". */
export function formatAudioTime(seconds: number): string {
	const { hours, minutes } = splitSeconds(seconds);
	if (hours === 0) return `${minutes} min`;
	return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** Whole percent (0 to 100) from time listened and the total length. */
export function percentFromSeconds(current: number, total: number): number {
	if (total <= 0) return 0;
	return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}

/** Clamp a position to the recording (never past the end). */
export function clampAudioPosition(current: number, total: number): number {
	return Math.min(Math.max(0, Math.floor(current)), Math.max(0, total));
}

export const EDITION_FORMATS = [
	"paperback",
	"hardcover",
	"ebook",
	"audiobook",
	"other",
] as const;

export type EditionFormat = (typeof EDITION_FORMATS)[number];

/** Open Library writes the format as free text ("Paperback", "Audio CD", "Kindle Edition"). */
export function editionFormatFromText(
	value: string | null | undefined,
): EditionFormat | null {
	const text = value?.trim().toLowerCase() ?? "";
	if (!text) return null;
	if (text.includes("audio")) return "audiobook";
	if (text.includes("hard")) return "hardcover";
	if (text.includes("paper") || text.includes("mass market"))
		return "paperback";
	if (
		text.includes("ebook") ||
		text.includes("e-book") ||
		text.includes("kindle") ||
		text.includes("epub")
	)
		return "ebook";
	return "other";
}
