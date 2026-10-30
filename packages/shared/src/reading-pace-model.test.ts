import { describe, expect, test } from "bun:test";
import {
	autoEstimate,
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
		expect(result).toEqual({
			ok: false,
			reason: "not_enough",
			usable: 1,
			tooFast: 1,
		});
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
			usable: 1,
			tooFast: 0,
		});
		expect(learnPace([], "percent")).toEqual({
			ok: false,
			reason: "not_enough",
			usable: 0,
			tooFast: 0,
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
	test("a stretch closes once enough time has passed and the member moved forward", () => {
		let state = startCollecting(10, 0);
		state = collectUpdate(state, 16, 300);
		state = collectUpdate(state, 24, 600);
		expect(state.samples).toEqual([
			{ gain: 6, activeSeconds: 300 },
			{ gain: 8, activeSeconds: 300 },
		]);
	});

	test("updating often, a page at a time, keeps one stretch open instead of many tiny ones", () => {
		let state = startCollecting(10, 0);
		for (let page = 11; page <= 16; page += 1) {
			state = collectUpdate(state, page, (page - 10) * 2);
		}
		expect(state.samples).toEqual([]);
		state = collectUpdate(state, 17, 60);
		expect(state.samples).toEqual([{ gain: 7, activeSeconds: 60 }]);
	});

	test("a correction backwards only moves the start", () => {
		let state = startCollecting(10, 0);
		state = collectUpdate(state, 6, 100);
		state = collectUpdate(state, 12, 400);
		expect(state.samples).toEqual([{ gain: 6, activeSeconds: 300 }]);
	});

	test("staying on the same page for a long time keeps measuring from the start", () => {
		let state = startCollecting(10, 0);
		state = collectUpdate(state, 10, 120);
		expect(state.samples).toEqual([]);
		state = collectUpdate(state, 14, 240);
		expect(state.samples).toEqual([{ gain: 4, activeSeconds: 240 }]);
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

describe("autoEstimate", () => {
	const base = {
		baseline: 100,
		baselineSeconds: 1000,
		perMinute: 3.4,
		max: 300,
	};

	test("nothing to show until the pace has moved the page by a whole page", () => {
		expect(autoEstimate({ ...base, nowSeconds: 1000 })).toBeNull();
		expect(autoEstimate({ ...base, nowSeconds: 1010 })).toBeNull();
	});

	test("it follows the clock from the baseline, not from the last render", () => {
		// 3.4 pages a minute: a page every ~17.6 seconds.
		expect(autoEstimate({ ...base, nowSeconds: 1018 })).toBe(101);
		expect(autoEstimate({ ...base, nowSeconds: 1060 })).toBe(103);
		expect(autoEstimate({ ...base, nowSeconds: 1600 })).toBe(134);
	});

	test("never past the last page", () => {
		expect(autoEstimate({ ...base, baseline: 299, nowSeconds: 9999 })).toBe(
			300,
		);
		expect(
			autoEstimate({ ...base, baseline: 300, nowSeconds: 9999 }),
		).toBeNull();
	});
});
