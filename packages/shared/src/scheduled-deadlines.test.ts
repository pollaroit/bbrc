import { describe, expect, test } from "bun:test";
import { getZonedParts, zonedTimeToUtc } from "./club-timezone";
import {
	CLUB_DEADLINE_HOUR,
	clampSittingDeadlineToClubEnd,
	computeMidtermAt,
	computeReadingEndWarningAt,
	defaultPollDeadline,
	POLL_DEADLINE_HOURS,
	snapPollDeadlineOnOrAfter,
	upcomingPollDeadlineSlots,
} from "./scheduled-deadlines";

const TZ = "Asia/Baku";

describe("scheduled deadlines", () => {
	test("poll slots are at hot hours club local", () => {
		const from = new Date("2026-03-30T08:00:00.000Z");
		const slots = upcomingPollDeadlineSlots(from, TZ, 1);

		for (const slot of slots.slice(0, 8)) {
			const parts = getZonedParts(slot, TZ);
			expect(POLL_DEADLINE_HOURS as readonly number[]).toContain(parts.hour);
			expect(parts.minute).toBe(0);
			expect(slot.getTime()).toBeGreaterThan(from.getTime());
		}
	});

	test("default poll deadline is ~12h ahead at a hot hour", () => {
		const from = new Date("2026-03-30T08:00:00.000Z");
		const deadline = defaultPollDeadline(from, TZ);
		const parts = getZonedParts(deadline, TZ);
		expect(POLL_DEADLINE_HOURS as readonly number[]).toContain(parts.hour);
		expect(deadline.getTime()).toBeGreaterThan(from.getTime());
	});

	test("sitting deadline clamps to default club end hour on that calendar day", () => {
		const raw = new Date("2026-06-15T14:22:00.000Z");
		const clamped = clampSittingDeadlineToClubEnd(raw, TZ);
		const parts = getZonedParts(clamped, TZ);
		expect(parts.hour).toBe(CLUB_DEADLINE_HOUR);
		expect(parts.minute).toBe(0);
	});

	test("snapPollDeadlineOnOrAfter moves to same-day 14:00", () => {
		const reference = zonedTimeToUtc(2026, 4, 1, 13, 30, TZ);
		const snapped = snapPollDeadlineOnOrAfter(reference, TZ);
		const parts = getZonedParts(snapped, TZ);
		expect(parts.hour).toBe(14);
		expect(snapped.getTime()).toBeGreaterThanOrEqual(reference.getTime());
	});

	test("computeMidtermAt snaps to a hot hour on or after midpoint", () => {
		const started = zonedTimeToUtc(2026, 4, 1, 14, 0, TZ);
		const ends = zonedTimeToUtc(2026, 4, 8, 20, 0, TZ);
		const midterm = computeMidtermAt(started, ends, TZ);
		const parts = getZonedParts(midterm, TZ);
		expect(POLL_DEADLINE_HOURS as readonly number[]).toContain(parts.hour);
		expect(midterm.getTime()).toBeGreaterThan(started.getTime());
		expect(midterm.getTime()).toBeLessThan(ends.getTime());
	});

	test("computeReadingEndWarningAt is 24h before deadline", () => {
		const ends = zonedTimeToUtc(2026, 4, 8, 20, 0, TZ);
		const warning = computeReadingEndWarningAt(ends);
		expect(warning.getTime()).toBe(ends.getTime() - 24 * 60 * 60 * 1000);
	});
});
