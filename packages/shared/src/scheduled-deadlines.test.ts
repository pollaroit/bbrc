import { describe, expect, test } from "bun:test";
import { getZonedParts, zonedTimeToUtc } from "./club-timezone";
import {
	CLUB_DEADLINE_HOUR,
	clampSittingDeadlineToClubEnd,
	defaultPollDeadline,
	snapPollDeadlineOnOrAfter,
	upcomingPollDeadlineSlots,
} from "./scheduled-deadlines";

const TZ = "Asia/Baku";

describe("scheduled deadlines", () => {
	test("poll slots are daily 20:00 club local", () => {
		const from = new Date("2026-03-30T08:00:00.000Z");
		const slots = upcomingPollDeadlineSlots(from, TZ, 2);

		for (const slot of slots.slice(0, 3)) {
			const parts = getZonedParts(slot, TZ);
			expect(parts.hour).toBe(CLUB_DEADLINE_HOUR);
			expect(parts.minute).toBe(0);
			expect(slot.getTime()).toBeGreaterThan(from.getTime());
		}
	});

	test("default poll deadline is ~12h ahead at 20:00", () => {
		const from = new Date("2026-03-30T08:00:00.000Z");
		const deadline = defaultPollDeadline(from, TZ);
		const parts = getZonedParts(deadline, TZ);
		expect(parts.hour).toBe(CLUB_DEADLINE_HOUR);
		expect(deadline.getTime()).toBeGreaterThan(from.getTime());
	});

	test("sitting deadline clamps to 20:00 club local", () => {
		const raw = new Date("2026-06-15T14:22:00.000Z");
		const clamped = clampSittingDeadlineToClubEnd(raw, TZ);
		const parts = getZonedParts(clamped, TZ);
		expect(parts.hour).toBe(CLUB_DEADLINE_HOUR);
		expect(parts.minute).toBe(0);
	});

	test("snapPollDeadlineOnOrAfter moves to same-day 20:00", () => {
		const reference = zonedTimeToUtc(2026, 4, 1, 13, 30, TZ);
		const snapped = snapPollDeadlineOnOrAfter(reference, TZ);
		const parts = getZonedParts(snapped, TZ);
		expect(parts.hour).toBe(CLUB_DEADLINE_HOUR);
		expect(snapped.getTime()).toBeGreaterThanOrEqual(reference.getTime());
	});
});
