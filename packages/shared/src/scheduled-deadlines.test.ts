import { describe, expect, test } from "bun:test";
import { getZonedParts, zonedTimeToUtc } from "./club-timezone";
import {
	clampSittingDeadlineToClubEnd,
	defaultPollDeadline,
	POLL_DEADLINE_HOURS,
	snapPollDeadlineOnOrAfter,
	upcomingPollDeadlineSlots,
} from "./scheduled-deadlines";

const TZ = "Asia/Baku";

describe("scheduled deadlines", () => {
	test("poll slots use club hours only", () => {
		const from = new Date("2026-03-30T08:00:00.000Z");
		const slots = upcomingPollDeadlineSlots(from, TZ, 2);

		for (const slot of slots.slice(0, 8)) {
			const parts = getZonedParts(slot, TZ);
			expect(parts.minute).toBe(0);
			expect(POLL_DEADLINE_HOURS).toContain(parts.hour as 0 | 12 | 16 | 20);
			expect(slot.getTime()).toBeGreaterThan(from.getTime());
		}
	});

	test("default poll deadline is ~12h ahead at a slot", () => {
		const from = new Date("2026-03-30T08:00:00.000Z");
		const deadline = defaultPollDeadline(from, TZ);
		const parts = getZonedParts(deadline, TZ);
		expect(POLL_DEADLINE_HOURS).toContain(parts.hour as 0 | 12 | 16 | 20);
		expect(deadline.getTime()).toBeGreaterThan(from.getTime());
	});

	test("sitting deadline clamps to 20:00 club local", () => {
		const raw = new Date("2026-06-15T14:22:00.000Z");
		const clamped = clampSittingDeadlineToClubEnd(raw, TZ);
		const parts = getZonedParts(clamped, TZ);
		expect(parts.hour).toBe(20);
		expect(parts.minute).toBe(0);
	});

	test("snapPollDeadlineOnOrAfter moves to next slot", () => {
		const reference = zonedTimeToUtc(2026, 4, 1, 13, 30, TZ);
		const snapped = snapPollDeadlineOnOrAfter(reference, TZ);
		const parts = getZonedParts(snapped, TZ);
		expect(parts.hour).toBe(16);
		expect(snapped.getTime()).toBeGreaterThanOrEqual(reference.getTime());
	});
});
