/**
 * The Reading Mode timer, as plain data and pure functions so it can be tested
 * without a browser.
 *
 * The one rule that keeps it honest: **time is never counted by ticking**. The
 * state only stores when the running stretch began (`runningSince`, wall-clock
 * milliseconds) and how much was banked before it. The time shown is worked out
 * from the clock each time it is asked, so a throttled background tab, a phone
 * that went to sleep, a reload or a restarted installed app all give the right
 * answer on return. The state is plain JSON, so it can be saved and restored.
 */

export type TimerMode = "free" | "countdown" | "pomodoro";
export type TimerPhase = "reading" | "break";
export type TimerStatus = "idle" | "running" | "paused" | "done";

export const MINUTE_MS = 60_000;
/** A single session never counts more reading than this. */
export const TIMER_MAX_READING_MS = 6 * 60 * MINUTE_MS;

export const POMODORO_DEFAULTS = { workMinutes: 25, breakMinutes: 5 } as const;
export const COUNTDOWN_MIN_MINUTES = 1;
export const COUNTDOWN_MAX_MINUTES = 360;

export type TimerConfig = {
	mode: TimerMode;
	/** Countdown: reading time to aim for. */
	targetMs: number | null;
	/** Pomodoro: lengths of a reading stretch and a break. */
	workMs: number;
	breakMs: number;
};

export type TimerState = {
	config: TimerConfig;
	status: TimerStatus;
	/** Wall-clock ms when the current running stretch began; null unless running. */
	runningSince: number | null;
	/** Reading time banked before `runningSince`. */
	readMs: number;
	/** Pomodoro: what the current phase is, and how long it has already lasted. */
	phase: TimerPhase;
	phaseMs: number;
	/** Pomodoro: reading stretches completed. */
	cycles: number;
};

export type TimerEvent =
	| { type: "target_reached"; at: number }
	| { type: "reading_done"; at: number }
	| { type: "break_done"; at: number }
	| { type: "limit_reached"; at: number };

export function clampCountdownMinutes(minutes: number): number {
	if (!Number.isFinite(minutes)) return COUNTDOWN_MIN_MINUTES;
	return Math.min(
		COUNTDOWN_MAX_MINUTES,
		Math.max(COUNTDOWN_MIN_MINUTES, Math.round(minutes)),
	);
}

export function createTimerConfig(
	input:
		| { mode: "free" }
		| { mode: "countdown"; minutes: number }
		| { mode: "pomodoro"; workMinutes?: number; breakMinutes?: number },
): TimerConfig {
	const base = {
		targetMs: null,
		workMs: POMODORO_DEFAULTS.workMinutes * MINUTE_MS,
		breakMs: POMODORO_DEFAULTS.breakMinutes * MINUTE_MS,
	};
	if (input.mode === "countdown") {
		return {
			...base,
			mode: "countdown",
			targetMs: clampCountdownMinutes(input.minutes) * MINUTE_MS,
		};
	}
	if (input.mode === "pomodoro") {
		return {
			...base,
			mode: "pomodoro",
			workMs:
				clampCountdownMinutes(
					input.workMinutes ?? POMODORO_DEFAULTS.workMinutes,
				) * MINUTE_MS,
			breakMs:
				clampCountdownMinutes(
					input.breakMinutes ?? POMODORO_DEFAULTS.breakMinutes,
				) * MINUTE_MS,
		};
	}
	return { ...base, mode: "free" };
}

export function createTimer(config: TimerConfig): TimerState {
	return {
		config,
		status: "idle",
		runningSince: null,
		readMs: 0,
		phase: "reading",
		phaseMs: 0,
		cycles: 0,
	};
}

/**
 * Brings the state up to `now`, crossing every boundary that passed on the way
 * (a countdown ending, a pomodoro changing phase, the session limit), and says
 * which ones. Safe to call as often as you like, and after any gap.
 */
export function settle(
	state: TimerState,
	now: number,
): { state: TimerState; events: TimerEvent[] } {
	if (state.status !== "running" || state.runningSince == null) {
		return { state, events: [] };
	}

	const events: TimerEvent[] = [];
	const next: TimerState = { ...state };
	let cursor = state.runningSince;
	// A clock that moved backwards never subtracts time.
	const end = Math.max(now, cursor);

	// Bounded by the number of phase changes a 6 hour session can hold.
	for (let guard = 0; guard < 2000 && cursor < end; guard++) {
		const remaining = end - cursor;
		const reading = next.phase === "reading";
		const limitLeft = TIMER_MAX_READING_MS - next.readMs;

		// Reading time before the next boundary of this kind of stretch.
		let untilBoundary = Number.POSITIVE_INFINITY;
		let boundary: "target" | "phase" | null = null;
		if (next.config.mode === "countdown" && next.config.targetMs != null) {
			untilBoundary = Math.max(0, next.config.targetMs - next.readMs);
			boundary = "target";
		} else if (next.config.mode === "pomodoro") {
			const length = reading ? next.config.workMs : next.config.breakMs;
			untilBoundary = Math.max(0, length - next.phaseMs);
			boundary = "phase";
		}

		const untilLimit = reading
			? Math.max(0, limitLeft)
			: Number.POSITIVE_INFINITY;
		const step = Math.min(remaining, untilBoundary, untilLimit);

		if (reading) next.readMs += step;
		next.phaseMs += step;
		cursor += step;

		if (reading && next.readMs >= TIMER_MAX_READING_MS) {
			next.readMs = TIMER_MAX_READING_MS;
			next.status = "done";
			next.runningSince = null;
			events.push({ type: "limit_reached", at: cursor });
			return { state: next, events };
		}

		if (step === untilBoundary && cursor <= end && boundary != null) {
			if (boundary === "target") {
				next.status = "done";
				next.runningSince = null;
				events.push({ type: "target_reached", at: cursor });
				return { state: next, events };
			}
			// Pomodoro: the phase ended exactly here.
			events.push({
				type: reading ? "reading_done" : "break_done",
				at: cursor,
			});
			if (reading) next.cycles += 1;
			next.phase = reading ? "break" : "reading";
			next.phaseMs = 0;
		}
	}

	next.runningSince = end;
	return { state: next, events };
}

export function startTimer(state: TimerState, now: number): TimerState {
	if (state.status === "running") return state;
	if (state.status === "done") return state;
	return { ...state, status: "running", runningSince: now };
}

export function pauseTimer(state: TimerState, now: number): TimerState {
	const settled = settle(state, now).state;
	if (settled.status !== "running") return settled;
	return { ...settled, status: "paused", runningSince: null };
}

/** Starts again from the beginning, keeping the chosen mode. */
export function resetTimer(state: TimerState): TimerState {
	return createTimer(state.config);
}

/** A countdown that ran out carries on as a plain count-up. */
export function keepReading(state: TimerState, now: number): TimerState {
	if (state.status !== "done") return state;
	if (state.readMs >= TIMER_MAX_READING_MS) return state;
	return {
		...state,
		config: { ...state.config, mode: "free", targetMs: null },
		status: "running",
		runningSince: now,
	};
}

/** Skips the rest of a pomodoro break (or reading stretch) and starts the other phase. */
export function skipPhase(state: TimerState, now: number): TimerState {
	if (state.config.mode !== "pomodoro") return state;
	const settled = settle(state, now).state;
	return {
		...settled,
		cycles:
			settled.phase === "reading" && settled.phaseMs > 0
				? settled.cycles + 1
				: settled.cycles,
		phase: settled.phase === "reading" ? "break" : "reading",
		phaseMs: 0,
	};
}

export type TimerReading = {
	status: TimerStatus;
	phase: TimerPhase;
	/** Reading time so far. */
	readMs: number;
	/** What the clock face shows: count-up time, time left, or time left in the phase. */
	displayMs: number;
	direction: "up" | "down";
	/** Countdown: reading time left. Pomodoro: time left in this phase. */
	remainingMs: number | null;
	cycles: number;
};

/** What to show at `now` (without changing the state). */
export function readTimer(state: TimerState, now: number): TimerReading {
	const { state: at } = settle(state, now);
	let remainingMs: number | null = null;
	if (at.config.mode === "countdown" && at.config.targetMs != null) {
		remainingMs = Math.max(0, at.config.targetMs - at.readMs);
	} else if (at.config.mode === "pomodoro") {
		const length =
			at.phase === "reading" ? at.config.workMs : at.config.breakMs;
		remainingMs = Math.max(0, length - at.phaseMs);
	}
	const down = remainingMs != null;
	return {
		status: at.status,
		phase: at.phase,
		readMs: at.readMs,
		displayMs: down ? (remainingMs ?? 0) : at.readMs,
		direction: down ? "down" : "up",
		remainingMs,
		cycles: at.cycles,
	};
}

/** Whole seconds of reading, for saving. */
export function readSeconds(state: TimerState, now: number): number {
	return Math.floor(readTimer(state, now).readMs / 1000);
}

/** "1:05:09" or "25:00". */
export function formatClock(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;
	const two = (value: number) => String(value).padStart(2, "0");
	return hours > 0
		? `${hours}:${two(minutes)}:${two(seconds)}`
		: `${two(minutes)}:${two(seconds)}`;
}

/** "32 min", "1 h 05 min", "45 s". */
export function formatDuration(seconds: number): string {
	const total = Math.max(0, Math.round(seconds));
	if (total < 60) return `${total} s`;
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	if (hours === 0) return `${minutes} min`;
	return `${hours} h ${String(minutes).padStart(2, "0")} min`;
}

const STATUSES: readonly TimerStatus[] = ["idle", "running", "paused", "done"];

/** Reads a saved state back, refusing anything that does not look like one. */
export function parseTimerState(value: unknown): TimerState | null {
	if (!value || typeof value !== "object") return null;
	const raw = value as Record<string, unknown>;
	const config = raw.config as Record<string, unknown> | undefined;
	if (!config || typeof config !== "object") return null;
	const num = (input: unknown) =>
		typeof input === "number" && Number.isFinite(input) ? input : null;

	const mode = config.mode;
	if (mode !== "free" && mode !== "countdown" && mode !== "pomodoro")
		return null;
	const workMs = num(config.workMs);
	const breakMs = num(config.breakMs);
	const targetMs = config.targetMs == null ? null : num(config.targetMs);
	const readMs = num(raw.readMs);
	const phaseMs = num(raw.phaseMs);
	const cycles = num(raw.cycles);
	const runningSince = raw.runningSince == null ? null : num(raw.runningSince);
	if (
		workMs == null ||
		breakMs == null ||
		workMs <= 0 ||
		breakMs <= 0 ||
		readMs == null ||
		readMs < 0 ||
		phaseMs == null ||
		phaseMs < 0 ||
		cycles == null ||
		cycles < 0
	) {
		return null;
	}
	if (!STATUSES.includes(raw.status as TimerStatus)) return null;
	if (raw.phase !== "reading" && raw.phase !== "break") return null;
	if (mode === "countdown" && (targetMs == null || targetMs <= 0)) return null;
	if (raw.status === "running" && runningSince == null) return null;

	return {
		config: { mode, targetMs, workMs, breakMs },
		status: raw.status as TimerStatus,
		runningSince: raw.status === "running" ? runningSince : null,
		readMs,
		phase: raw.phase,
		phaseMs,
		cycles,
	};
}
