import { describe, expect, it } from "bun:test";
import {
	POST_SCHEDULE_MAX_FROM_FIRST_MS,
	POST_SCHEDULE_MIN_AHEAD_MS,
	snapPostScheduleToWholeHour,
	upcomingPostScheduleSlots,
	validatePostScheduleTime,
} from "./post-scheduling";

const TZ = "Asia/Baku";

describe("post scheduling", () => {
	it("snaps to the next whole club hour", () => {
		const now = new Date("2026-11-01T10:30:00.000Z");
		const picked = new Date("2026-11-01T10:45:00.000Z");
		const snapped = snapPostScheduleToWholeHour(picked, now, TZ);
		expect(snapped.toISOString()).toBe("2026-11-01T11:00:00.000Z");
	});

	it("rejects times under one hour ahead", () => {
		const now = new Date("2026-11-01T10:00:00.000Z");
		const scheduledAt = new Date("2026-11-01T10:00:00.000Z");
		expect(
			validatePostScheduleTime(
				{ scheduledAt, now, firstScheduledAt: null },
				TZ,
			),
		).toMatch(/at least one hour/);
	});

	it("allows a slot at least one hour ahead", () => {
		const now = new Date("2026-11-01T10:00:00.000Z");
		const scheduledAt = new Date("2026-11-01T11:00:00.000Z");
		expect(
			validatePostScheduleTime(
				{ scheduledAt, now, firstScheduledAt: null },
				TZ,
			),
		).toBeNull();
	});

	it("caps reschedule at one month from first scheduled time", () => {
		const first = new Date("2026-11-01T12:00:00.000Z");
		const now = new Date("2026-11-20T12:00:00.000Z");
		const tooLate = new Date(
			first.getTime() + POST_SCHEDULE_MAX_FROM_FIRST_MS + MS_PER_HOUR,
		);
		expect(
			validatePostScheduleTime(
				{ scheduledAt: tooLate, now, firstScheduledAt: first },
				TZ,
			),
		).toMatch(/one month/);
	});

	it("lists hourly slots at least one hour ahead", () => {
		const from = new Date("2026-11-01T10:15:00.000Z");
		const slots = upcomingPostScheduleSlots(from, TZ, 3);
		expect(slots).toHaveLength(3);
		const first = slots[0];
		const second = slots[1];
		if (first == null || second == null) {
			throw new Error("expected three slots");
		}
		expect(first.toISOString()).toBe("2026-11-01T12:00:00.000Z");
		expect(first.getTime() - from.getTime()).toBeGreaterThanOrEqual(
			POST_SCHEDULE_MIN_AHEAD_MS,
		);
		expect(second.getTime() - first.getTime()).toBe(POST_SCHEDULE_MIN_AHEAD_MS);
	});
});

const MS_PER_HOUR = 60 * 60 * 1000;
