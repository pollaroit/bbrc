import { addDays, weekStart } from "@bbrc/shared";

/** Seconds read in each of the last `weeks` weeks (Monday first), oldest first, zeros included. */
export function weeklySeconds(
	days: { day: string; seconds: number }[],
	today: string,
	weeks: number,
): { week: string; seconds: number }[] {
	const first = weekStart(addDays(today, -7 * (weeks - 1)));
	const buckets = new Map<string, number>();
	for (let i = 0; i < weeks; i++) buckets.set(addDays(first, i * 7), 0);
	for (const entry of days) {
		const week = weekStart(entry.day);
		if (buckets.has(week)) {
			buckets.set(week, (buckets.get(week) ?? 0) + entry.seconds);
		}
	}
	return [...buckets.entries()].map(([week, seconds]) => ({ week, seconds }));
}
