import { describe, expect, test } from "bun:test";
import {
	clampSessionSeconds,
	isReadingNow,
	isSessionStale,
	READING_SESSION_MAX_SECONDS,
	readingHours,
	readingSessionStats,
} from "./reading-sessions";

const at = (iso: string) => new Date(iso);

describe("clampSessionSeconds", () => {
	const startedAt = at("2026-01-01T10:00:00Z");

	test("an honest report passes through", () => {
		expect(
			clampSessionSeconds({
				reported: 600,
				saved: 540,
				startedAt,
				lastBeatAt: at("2026-01-01T10:09:00Z"),
				now: at("2026-01-01T10:10:00Z"),
			}),
		).toBe(600);
	});

	test("it never goes down", () => {
		expect(
			clampSessionSeconds({
				reported: 100,
				saved: 540,
				startedAt,
				lastBeatAt: at("2026-01-01T10:09:00Z"),
				now: at("2026-01-01T10:10:00Z"),
			}),
		).toBe(540);
	});

	test("it cannot grow faster than the clock since the last beat", () => {
		expect(
			clampSessionSeconds({
				reported: 5000,
				saved: 540,
				startedAt,
				lastBeatAt: at("2026-01-01T10:09:00Z"),
				now: at("2026-01-01T10:10:00Z"),
			}),
		).toBe(540 + 60 + 5);
	});

	test("it cannot pass the time since the session began", () => {
		expect(
			clampSessionSeconds({
				reported: 99999,
				saved: 0,
				startedAt,
				lastBeatAt: startedAt,
				now: at("2026-01-01T10:01:00Z"),
			}),
		).toBe(65);
	});

	test("it cannot pass the limit", () => {
		expect(
			clampSessionSeconds({
				reported: 999_999,
				saved: READING_SESSION_MAX_SECONDS - 10,
				startedAt,
				lastBeatAt: at("2026-01-02T10:00:00Z"),
				now: at("2026-01-02T10:00:30Z"),
			}),
		).toBe(READING_SESSION_MAX_SECONDS);
	});

	test("rubbish falls back to what was saved", () => {
		expect(
			clampSessionSeconds({
				reported: Number.NaN,
				saved: 30,
				startedAt,
				lastBeatAt: startedAt,
				now: at("2026-01-01T10:05:00Z"),
			}),
		).toBe(30);
	});
});

describe("presence and stale sessions", () => {
	const last = at("2026-01-01T10:00:00Z");
	test("reading now for three minutes after the last beat", () => {
		expect(isReadingNow(last, at("2026-01-01T10:03:00Z"))).toBe(true);
		expect(isReadingNow(last, at("2026-01-01T10:03:01Z"))).toBe(false);
	});
	test("stale after half an hour", () => {
		expect(isSessionStale(last, at("2026-01-01T10:30:00Z"))).toBe(false);
		expect(isSessionStale(last, at("2026-01-01T10:30:01Z"))).toBe(true);
	});
});

describe("readingSessionStats", () => {
	test("ignores accidents and averages the rest", () => {
		const stats = readingSessionStats([
			{ activeSeconds: 5 },
			{ activeSeconds: 600 },
			{ activeSeconds: 1800 },
		]);
		expect(stats).toEqual({
			count: 2,
			totalSeconds: 2400,
			averageSeconds: 1200,
			longestSeconds: 1800,
		});
	});
	test("nothing yet", () => {
		expect(readingSessionStats([])).toEqual({
			count: 0,
			totalSeconds: 0,
			averageSeconds: 0,
			longestSeconds: 0,
		});
	});
});

test("readingHours counts whole hours", () => {
	expect(readingHours(3599)).toBe(0);
	expect(readingHours(3600)).toBe(1);
	expect(readingHours(-1)).toBe(0);
});
