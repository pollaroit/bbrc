import { describe, expect, test } from "bun:test";
import {
	collectUpdate,
	describePace,
	estimatePosition,
	learnPace,
	startCollecting,
} from "./reading-pace-model";

describe("learnPace", () => {
	test("the mean of steady stretches", () => {
		const result = learnPace(
			[
				{ gain: 6, activeSeconds: 300 },
				{ gain: 8, activeSeconds: 300 },
			],
			"pages",
		);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.perMinute).toBeCloseTo(1.4, 5);
	});

	test("too short, no gain and impossible speeds are ignored", () => {
		const result = learnPace(
			[
				{ gain: 5, activeSeconds: 10 },
				{ gain: 0, activeSeconds: 300 },
				{ gain: 100, activeSeconds: 60 },
				{ gain: 6, activeSeconds: 300 },
			],
			"pages",
		);
		expect(result).toEqual({ ok: false, reason: "not_enough" });
	});

	test("a stretch far from the median is thrown away", () => {
		const result = learnPace(
			[
				{ gain: 6, activeSeconds: 300 },
				{ gain: 6, activeSeconds: 300 },
				{ gain: 6, activeSeconds: 300 },
				{ gain: 60, activeSeconds: 300 },
			],
			"pages",
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.perMinute).toBeCloseTo(1.2, 5);
			expect(result.used).toBe(3);
		}
	});

	test("needs at least two usable stretches", () => {
		expect(learnPace([{ gain: 6, activeSeconds: 300 }], "pages")).toEqual({
			ok: false,
			reason: "not_enough",
		});
		expect(learnPace([], "percent")).toEqual({
			ok: false,
			reason: "not_enough",
		});
	});

	test("audio is counted in seconds per minute (playback speed)", () => {
		const result = learnPace(
			[
				{ gain: 330, activeSeconds: 300 },
				{ gain: 330, activeSeconds: 300 },
			],
			"seconds",
		);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.perMinute).toBeCloseTo(66, 5);
	});
});

describe("collecting", () => {
	test("each move forward is a stretch; a correction only moves the start", () => {
		let state = startCollecting(10, 0);
		state = collectUpdate(state, 16, 300);
		state = collectUpdate(state, 12, 400);
		state = collectUpdate(state, 20, 700);
		expect(state.samples).toEqual([
			{ gain: 6, activeSeconds: 300 },
			{ gain: 8, activeSeconds: 300 },
		]);
		expect(state.lastValue).toBe(20);
	});

	test("staying on the same page adds nothing", () => {
		const state = collectUpdate(startCollecting(10, 0), 10, 120);
		expect(state.samples).toEqual([]);
		expect(state.lastActiveSeconds).toBe(120);
	});
});

describe("estimatePosition", () => {
	test("last confirmed place plus pace times active time", () => {
		expect(
			estimatePosition({
				baseline: 100,
				perMinute: 1.5,
				activeSecondsSinceBaseline: 600,
				max: 300,
			}),
		).toBe(115);
	});

	test("never past the last page, never behind the baseline", () => {
		expect(
			estimatePosition({
				baseline: 295,
				perMinute: 2,
				activeSecondsSinceBaseline: 3600,
				max: 300,
			}),
		).toBe(300);
		expect(
			estimatePosition({
				baseline: 50,
				perMinute: 2,
				activeSecondsSinceBaseline: -10,
				max: 300,
			}),
		).toBe(50);
	});
});

describe("describePace", () => {
	test("reads naturally for pages and audio", () => {
		expect(describePace(1.4, "pages")).toBe(
			"about 1.4 pages a minute (84 an hour)",
		);
		expect(describePace(66, "seconds")).toBe("about 1.10x listening speed");
	});
});
