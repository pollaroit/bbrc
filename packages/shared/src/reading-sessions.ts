/** Rules for saved Reading Mode sessions. Pure, so the server and the tests share them. */

export const READING_SESSION_MODES = ["free", "countdown", "pomodoro"] as const;

/** A session never counts more than this much reading (matches the timer's limit). */
export const READING_SESSION_MAX_SECONDS = 6 * 60 * 60;

/** How often the open page tells the server it is still reading. */
export const READING_BEAT_INTERVAL_MS = 60_000;

/** Someone counts as "reading now" for this long after their last beat. */
export const READING_PRESENCE_TTL_MS = 3 * 60_000;

/** A session nobody has beaten for this long is closed at its last beat. */
export const READING_SESSION_STALE_MS = 30 * 60_000;

export function isReadingNow(lastBeatAt: Date, now: Date): boolean {
	return now.getTime() - lastBeatAt.getTime() <= READING_PRESENCE_TTL_MS;
}

export function isSessionStale(lastBeatAt: Date, now: Date): boolean {
	return now.getTime() - lastBeatAt.getTime() > READING_SESSION_STALE_MS;
}

/**
 * The reading time to save, as reported by the page, held to what is possible:
 * it never goes down, never grows faster than the clock since the last beat
 * (plus a few seconds of slack), never exceeds the time since the session began
 * and never passes the limit. The page's clock is trusted for the amount, the
 * server's for the ceiling, so a wrong or tampered number cannot inflate
 * anything.
 */
export function clampSessionSeconds(input: {
	reported: number;
	saved: number;
	startedAt: Date;
	lastBeatAt: Date;
	now: Date;
}): number {
	const { reported, saved, startedAt, lastBeatAt, now } = input;
	const slack = 5;
	const sinceStart = Math.max(
		0,
		Math.floor((now.getTime() - startedAt.getTime()) / 1000) + slack,
	);
	const sinceBeat = Math.max(
		0,
		Math.floor((now.getTime() - lastBeatAt.getTime()) / 1000) + slack,
	);
	const wanted = Number.isFinite(reported) ? Math.floor(reported) : saved;
	return Math.max(
		saved,
		Math.min(
			wanted,
			saved + sinceBeat,
			sinceStart,
			READING_SESSION_MAX_SECONDS,
		),
	);
}

export type SessionStats = {
	count: number;
	totalSeconds: number;
	averageSeconds: number;
	longestSeconds: number;
};

/** Numbers over finished sessions. Sessions under 30 seconds are left out as accidents. */
export function readingSessionStats(
	sessions: { activeSeconds: number }[],
): SessionStats {
	const real = sessions.filter((session) => session.activeSeconds >= 30);
	const totalSeconds = real.reduce((sum, row) => sum + row.activeSeconds, 0);
	return {
		count: real.length,
		totalSeconds,
		averageSeconds:
			real.length > 0 ? Math.round(totalSeconds / real.length) : 0,
		longestSeconds: real.reduce(
			(max, row) => Math.max(max, row.activeSeconds),
			0,
		),
	};
}

/** Whole hours, for the "hours read" achievement. */
export function readingHours(totalSeconds: number): number {
	return Math.floor(Math.max(0, totalSeconds) / 3600);
}
