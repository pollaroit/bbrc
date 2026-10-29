import { describe, expect, test } from "bun:test";
import {
	createTimer,
	createTimerConfig,
	formatClock,
	formatDuration,
	keepReading,
	MINUTE_MS,
	parseTimerState,
	pauseTimer,
	readSeconds,
	readTimer,
	resetTimer,
	settle,
	skipPhase,
	startTimer,
	TIMER_MAX_READING_MS,
} from "./reading-timer";

const T0 = 1_700_000_000_000;
const min = (n: number) => n * MINUTE_MS;

function started(config = createTimerConfig({ mode: "free" })) {
	return startTimer(createTimer(config), T0);
}

describe("count-up", () => {
	test("time comes from the clock, not from ticks", () => {
		const timer = started();
		// No tick happened for 3 hours (a sleeping phone): the time is still right.
		expect(readSeconds(timer, T0 + min(180))).toBe(180 * 60);
		expect(readSeconds(timer, T0 + 1500)).toBe(1);
	});

	test("pause banks the time and stops counting", () => {
		let timer = started();
		timer = pauseTimer(timer, T0 + min(10));
		expect(timer.status).toBe("paused");
		expect(readSeconds(timer, T0 + min(500))).toBe(600);
	});

	test("resume carries on from the bank", () => {
		let timer = pauseTimer(started(), T0 + min(10));
		timer = startTimer(timer, T0 + min(20));
		expect(readSeconds(timer, T0 + min(25))).toBe(15 * 60);
	});

	test("settling twice, or going back in time, never loses or adds time", () => {
		const timer = started();
		const first = settle(timer, T0 + min(5)).state;
		const second = settle(first, T0 + min(5)).state;
		expect(second.readMs).toBe(first.readMs);
		// A clock that jumped backwards adds nothing.
		const back = settle(first, T0 + min(1)).state;
		expect(back.readMs).toBe(first.readMs);
	});

	test("an idle timer counts nothing", () => {
		const timer = createTimer(createTimerConfig({ mode: "free" }));
		expect(readTimer(timer, T0 + min(60)).readMs).toBe(0);
	});

	test("reset goes back to zero and keeps the mode", () => {
		const config = createTimerConfig({ mode: "countdown", minutes: 20 });
		const reset = resetTimer(started(config));
		expect(reset.status).toBe("idle");
		expect(reset.config).toEqual(config);
		expect(reset.readMs).toBe(0);
	});

	test("a session stops at the limit", () => {
		const { state, events } = settle(
			started(),
			T0 + TIMER_MAX_READING_MS + min(90),
		);
		expect(state.status).toBe("done");
		expect(state.readMs).toBe(TIMER_MAX_READING_MS);
		expect(events.map((event) => event.type)).toEqual(["limit_reached"]);
		expect(keepReading(state, T0 + TIMER_MAX_READING_MS)).toEqual(state);
	});
});

describe("countdown", () => {
	const config = createTimerConfig({ mode: "countdown", minutes: 30 });

	test("counts down and says when the target is reached", () => {
		const timer = started(config);
		const mid = readTimer(timer, T0 + min(10));
		expect(mid.direction).toBe("down");
		expect(mid.remainingMs).toBe(min(20));
		expect(mid.displayMs).toBe(min(20));

		const { state, events } = settle(timer, T0 + min(45));
		expect(state.status).toBe("done");
		expect(state.readMs).toBe(min(30));
		expect(events).toEqual([{ type: "target_reached", at: T0 + min(30) }]);
	});

	test("pausing does not use up the target", () => {
		let timer = pauseTimer(started(config), T0 + min(10));
		timer = startTimer(timer, T0 + min(60));
		expect(readTimer(timer, T0 + min(70)).remainingMs).toBe(min(10));
	});

	test("keep reading turns it into a count-up that continues", () => {
		const done = settle(started(config), T0 + min(31)).state;
		const next = keepReading(done, T0 + min(31));
		expect(next.status).toBe("running");
		expect(next.config.mode).toBe("free");
		expect(readSeconds(next, T0 + min(36))).toBe(35 * 60);
	});

	test("the target is clamped to something sensible", () => {
		expect(createTimerConfig({ mode: "countdown", minutes: 0 }).targetMs).toBe(
			MINUTE_MS,
		);
		expect(
			createTimerConfig({ mode: "countdown", minutes: 99999 }).targetMs,
		).toBe(360 * MINUTE_MS);
	});
});

describe("pomodoro", () => {
	const config = createTimerConfig({ mode: "pomodoro" });

	test("25 minutes of reading, then a 5 minute break that is not reading time", () => {
		const timer = started(config);
		const reading = readTimer(timer, T0 + min(10));
		expect(reading.phase).toBe("reading");
		expect(reading.remainingMs).toBe(min(15));

		const inBreak = readTimer(timer, T0 + min(27));
		expect(inBreak.phase).toBe("break");
		expect(inBreak.remainingMs).toBe(min(3));
		expect(inBreak.readMs).toBe(min(25));
		expect(inBreak.cycles).toBe(1);
	});

	test("coming back after a long gap crosses every phase and reports them", () => {
		// 2 hours: 4 full 30 minute rounds.
		const { state, events } = settle(started(config), T0 + min(120));
		expect(state.readMs).toBe(min(100));
		expect(state.cycles).toBe(4);
		expect(
			events.filter((event) => event.type === "reading_done"),
		).toHaveLength(4);
		expect(events.filter((event) => event.type === "break_done")).toHaveLength(
			4,
		);
		expect(state.phase).toBe("reading");
	});

	test("events happen at the exact moment, not when we looked", () => {
		const { events } = settle(started(config), T0 + min(40));
		expect(events).toEqual([
			{ type: "reading_done", at: T0 + min(25) },
			{ type: "break_done", at: T0 + min(30) },
		]);
	});

	test("pausing in a break keeps the rest of the break", () => {
		let timer = pauseTimer(started(config), T0 + min(27));
		expect(timer.phase).toBe("break");
		timer = startTimer(timer, T0 + min(100));
		expect(readTimer(timer, T0 + min(101)).remainingMs).toBe(min(2));
	});

	test("skipping a break starts reading at once", () => {
		const inBreak = settle(started(config), T0 + min(26)).state;
		const skipped = skipPhase(inBreak, T0 + min(26));
		expect(skipped.phase).toBe("reading");
		expect(skipped.phaseMs).toBe(0);
	});

	test("custom lengths", () => {
		const custom = createTimerConfig({
			mode: "pomodoro",
			workMinutes: 50,
			breakMinutes: 10,
		});
		expect(readTimer(started(custom), T0 + min(51)).phase).toBe("break");
	});
});

describe("saving and restoring", () => {
	test("a running timer survives being saved and read back, however long it was gone", () => {
		const timer = started(
			createTimerConfig({ mode: "countdown", minutes: 60 }),
		);
		const restored = parseTimerState(JSON.parse(JSON.stringify(timer)));
		expect(restored).toEqual(timer);
		expect(readTimer(restored as typeof timer, T0 + min(20)).remainingMs).toBe(
			min(40),
		);
	});

	test("rubbish is refused", () => {
		expect(parseTimerState(null)).toBeNull();
		expect(parseTimerState("x")).toBeNull();
		expect(parseTimerState({})).toBeNull();
		const timer = started();
		expect(parseTimerState({ ...timer, readMs: -5 })).toBeNull();
		expect(parseTimerState({ ...timer, status: "flying" })).toBeNull();
		expect(parseTimerState({ ...timer, runningSince: null })).toBeNull();
		expect(
			parseTimerState({ ...timer, config: { ...timer.config, mode: "x" } }),
		).toBeNull();
	});
});

describe("formatting", () => {
	test("clock", () => {
		expect(formatClock(0)).toBe("00:00");
		expect(formatClock(min(25))).toBe("25:00");
		expect(formatClock(65 * 60 * 1000 + 9000)).toBe("1:05:09");
		expect(formatClock(-5)).toBe("00:00");
	});

	test("duration", () => {
		expect(formatDuration(45)).toBe("45 s");
		expect(formatDuration(32 * 60)).toBe("32 min");
		expect(formatDuration(3900)).toBe("1 h 05 min");
	});
});
