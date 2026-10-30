"use client";

import type {
	EndReadingSessionOutput,
	ReadingSessionView,
} from "@bbrc/api/modules/reading-session/reading-session.schema";
import {
	createTimer,
	createTimerConfig,
	formatDuration,
	keepReading as keepReadingTimer,
	MINUTE_MS,
	pauseTimer,
	READING_BEAT_INTERVAL_MS,
	readSeconds,
	readTimer,
	settle,
	skipPhase,
	startTimer,
	type TimerConfig,
	type TimerEvent,
	type TimerReading,
	type TimerState,
} from "@bbrc/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { invalidateReadingQueries } from "@/lib/reading/use-reading";
import { signal, unlockAudio } from "@/lib/reading-mode/alerts";
import {
	clearSavedSession,
	loadSavedSession,
	saveSession,
} from "@/lib/reading-mode/storage";
import { orpc, queryClient } from "@/utils/orpc";

/*
 * One Reading Mode session, from the first tap to the summary.
 *
 * Why it does not stop by accident:
 *  - the time is worked out from the clock (see `reading-timer.ts`), so a
 *    throttled tab, a sleeping phone or a reload cannot lose it;
 *  - the state is saved in this browser on every change, and the server keeps
 *    the reading time too (a beat every minute, and whenever the page is hidden
 *    or comes back), so a killed installed app can pick up again;
 *  - a session the server closed while the page was quiet is reopened rather
 *    than dropped.
 */

export type SessionPhase =
	| { kind: "loading" }
	| { kind: "setup" }
	/** There is an open session for this book that this browser knows nothing about. */
	| { kind: "takeover"; session: ReadingSessionView }
	| { kind: "active" }
	| {
			kind: "ended";
			summary: EndReadingSessionOutput | null;
			/** Set when another device took the session over. */
			notice: string | null;
			seconds: number;
	  };

export type TimerNotice = {
	id: number;
	title: string;
	body: string;
};

const FRESH_ALERT_MS = 2 * MINUTE_MS;

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function describe(event: TimerEvent, config: TimerConfig): TimerNotice {
	const id = event.at;
	switch (event.type) {
		case "target_reached":
			return {
				id,
				title: "Time is up",
				body: `You read for ${formatDuration((config.targetMs ?? 0) / 1000)}.`,
			};
		case "reading_done":
			return {
				id,
				title: "Time for a break",
				body: `Rest your eyes for ${formatDuration(config.breakMs / 1000)}.`,
			};
		case "break_done":
			return {
				id,
				title: "Back to reading",
				body: "The break is over.",
			};
		case "limit_reached":
			return {
				id,
				title: "That is a long session",
				body: "Six hours is the most a session counts. Take a proper break.",
			};
	}
}

/** The storage key of a session without a book (there is at most one open session per member). */
export const FREE_SESSION_KEY = "free";

/**
 * `options.free`: a session without a book (the page at `/reading`). It is saved
 * and recovered the same way, but never touches a reading.
 */
export function useReadingSession(
	readingId: string,
	options?: { free?: boolean },
) {
	const free = options?.free === true;
	const key = free ? FREE_SESSION_KEY : readingId;
	const [phase, setPhase] = useState<SessionPhase>({ kind: "loading" });
	const [timer, setTimer] = useState<TimerState | null>(null);
	const [now, setNow] = useState(() => Date.now());
	const [notice, setNotice] = useState<TimerNotice | null>(null);
	const [busy, setBusy] = useState(false);

	const timerRef = useRef<TimerState | null>(null);
	const sessionIdRef = useRef<string | null>(null);

	const commit = useCallback(
		(next: TimerState | null) => {
			timerRef.current = next;
			setTimer(next);
			const id = sessionIdRef.current;
			if (next && id) saveSession(key, { sessionId: id, timer: next });
		},
		[key],
	);

	const announce = useCallback((events: TimerEvent[], config: TimerConfig) => {
		const at = Date.now();
		for (const event of events) {
			const message = describe(event, config);
			setNotice(message);
			// An event from long ago (found after a sleep) shows, but does not ring.
			if (at - event.at <= FRESH_ALERT_MS) {
				signal(
					event.type === "target_reached" || event.type === "limit_reached"
						? "double"
						: "single",
					message.title,
					message.body,
				);
			}
		}
	}, []);

	const finishedWith = useCallback(
		(summary: EndReadingSessionOutput | null, noticeText: string | null) => {
			const seconds = timerRef.current
				? readSeconds(timerRef.current, Date.now())
				: (summary?.activeSeconds ?? 0);
			clearSavedSession(key);
			sessionIdRef.current = null;
			timerRef.current = null;
			setTimer(null);
			setPhase({
				kind: "ended",
				summary,
				notice: noticeText,
				seconds: summary?.activeSeconds ?? seconds,
			});
			invalidateReadingQueries();
			void queryClient.invalidateQueries({
				queryKey: orpc.readingSession.key(),
			});
		},
		[key],
	);

	const restore = useCallback(
		(saved: TimerState, sessionId: string) => {
			sessionIdRef.current = sessionId;
			const caught = settle(saved, Date.now());
			commit(caught.state);
			if (caught.events.length > 0) announce(caught.events, saved.config);
			setNow(Date.now());
			setPhase({ kind: "active" });
		},
		[announce, commit],
	);

	// ── Boot: find out where this session stands ─────────────────────────
	useEffect(() => {
		// The reading is still loading.
		if (!key) return;
		let cancelled = false;

		async function boot() {
			const saved = loadSavedSession(key);
			let current: ReadingSessionView | null = null;
			let reachable = true;
			try {
				current = free
					? (await orpc.readingSession.currentFree.call()).session
					: (await orpc.readingSession.current.call({ readingId })).session;
			} catch {
				reachable = false;
			}
			if (cancelled) return;

			if (saved && current && current.id === saved.sessionId) {
				restore(saved.timer, saved.sessionId);
				return;
			}

			if (saved && !reachable) {
				// Offline: trust this browser; the next beat catches the server up.
				restore(saved.timer, saved.sessionId);
				return;
			}

			if (saved && !current) {
				// The server closed it while the page was quiet: reopen it.
				try {
					await orpc.readingSession.resume.call({
						sessionId: saved.sessionId,
						activeSeconds: readSeconds(saved.timer, Date.now()),
					});
					if (cancelled) return;
					restore(saved.timer, saved.sessionId);
					return;
				} catch {
					clearSavedSession(key);
				}
			} else if (saved) {
				// A different session is open now; ours was replaced.
				clearSavedSession(key);
			}

			setPhase(
				current ? { kind: "takeover", session: current } : { kind: "setup" },
			);
		}

		void boot();
		return () => {
			cancelled = true;
		};
	}, [key, free, readingId, restore]);

	// ── Keep the display moving, and notice boundaries ───────────────────
	const active = phase.kind === "active";
	useEffect(() => {
		if (!active) return;

		function refresh() {
			const at = Date.now();
			setNow(at);
			const current = timerRef.current;
			if (!current) return;
			const settled = settle(current, at);
			if (settled.events.length > 0) {
				commit(settled.state);
				announce(settled.events, current.config);
			}
		}

		const interval = window.setInterval(refresh, 500);
		// Coming back to the page: catch up at once instead of waiting for a tick.
		document.addEventListener("visibilitychange", refresh);
		window.addEventListener("pageshow", refresh);
		window.addEventListener("focus", refresh);
		return () => {
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", refresh);
			window.removeEventListener("pageshow", refresh);
			window.removeEventListener("focus", refresh);
		};
	}, [active, announce, commit]);

	// ── Tell the server we are still reading ────────────────────────────
	const beat = useCallback(async () => {
		const id = sessionIdRef.current;
		const current = timerRef.current;
		if (!id || !current) return;
		const seconds = readSeconds(current, Date.now());
		try {
			await orpc.readingSession.beat.call({
				sessionId: id,
				activeSeconds: seconds,
			});
		} catch (error) {
			const message = errorMessage(error);
			if (!/ended|not found/i.test(message)) return; // Offline or a hiccup: next beat.
			try {
				await orpc.readingSession.resume.call({
					sessionId: id,
					activeSeconds: seconds,
				});
			} catch (resumeError) {
				if (/somewhere else|CONFLICT/i.test(errorMessage(resumeError))) {
					finishedWith(
						null,
						"Reading Mode was started on another device, so this session ended there. Your time so far is saved.",
					);
				}
			}
		}
	}, [finishedWith]);

	useEffect(() => {
		if (!active) return;
		const interval = window.setInterval(
			() => void beat(),
			READING_BEAT_INTERVAL_MS,
		);
		const onVisibility = () => void beat();
		const onPageHide = () => void beat();
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("pagehide", onPageHide);
		window.addEventListener("online", onVisibility);
		return () => {
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("pagehide", onPageHide);
			window.removeEventListener("online", onVisibility);
		};
	}, [active, beat]);

	// ── Actions ──────────────────────────────────────────────────────────
	const begin = useCallback(
		async (config: TimerConfig, label?: string | null) => {
			setBusy(true);
			try {
				await unlockAudio();
				const targetMinutes =
					config.mode === "countdown" && config.targetMs
						? Math.round(config.targetMs / MINUTE_MS)
						: null;
				const session = free
					? await orpc.readingSession.startFree.call({
							mode: config.mode,
							targetMinutes,
							label: label ?? null,
						})
					: await orpc.readingSession.start.call({
							readingId,
							mode: config.mode,
							targetMinutes,
						});
				sessionIdRef.current = session.id;
				commit(startTimer(createTimer(config), Date.now()));
				setNotice(null);
				setNow(Date.now());
				setPhase({ kind: "active" });
			} finally {
				setBusy(false);
			}
		},
		[commit, free, readingId],
	);

	const adopt = useCallback(
		(session: ReadingSessionView) => {
			sessionIdRef.current = session.id;
			const config =
				session.mode === "countdown" && session.targetMinutes
					? createTimerConfig({
							mode: "countdown",
							minutes: session.targetMinutes,
						})
					: createTimerConfig({
							mode: session.mode === "pomodoro" ? "pomodoro" : "free",
						});
			// Paused at what the server saved: the member taps Resume when ready.
			commit({
				...createTimer(config),
				status: "paused",
				readMs: session.activeSeconds * 1000,
			});
			setNow(Date.now());
			setPhase({ kind: "active" });
		},
		[commit],
	);

	const pause = useCallback(() => {
		const current = timerRef.current;
		if (!current) return;
		commit(pauseTimer(current, Date.now()));
		setNow(Date.now());
		void beat();
	}, [beat, commit]);

	/**
	 * Stops the timer and saves the time so far, but keeps the session open: the
	 * member can leave the page (to add a book, say) and come back to the same
	 * session, paused where it was.
	 */
	const pauseForLeaving = useCallback(async () => {
		const current = timerRef.current;
		if (!current) return;
		if (current.status === "running") {
			commit(pauseTimer(current, Date.now()));
			setNow(Date.now());
		}
		await beat();
	}, [beat, commit]);

	const resume = useCallback(async () => {
		const current = timerRef.current;
		if (!current) return;
		await unlockAudio();
		commit(startTimer(current, Date.now()));
		setNow(Date.now());
		void beat();
	}, [beat, commit]);

	const keepReading = useCallback(() => {
		const current = timerRef.current;
		if (!current) return;
		commit(keepReadingTimer(current, Date.now()));
		setNotice(null);
		setNow(Date.now());
	}, [commit]);

	const skip = useCallback(() => {
		const current = timerRef.current;
		if (!current) return;
		commit(skipPhase(current, Date.now()));
		setNotice(null);
		setNow(Date.now());
	}, [commit]);

	const finish = useCallback(async () => {
		const id = sessionIdRef.current;
		const current = timerRef.current;
		if (!id || !current) return;
		setBusy(true);
		const seconds = readSeconds(pauseTimer(current, Date.now()), Date.now());
		try {
			const summary = await orpc.readingSession.end.call({
				sessionId: id,
				activeSeconds: seconds,
			});
			finishedWith(summary, null);
		} finally {
			setBusy(false);
		}
	}, [finishedWith]);

	const backToSetup = useCallback(() => {
		clearSavedSession(key);
		setNotice(null);
		setPhase({ kind: "setup" });
	}, [key]);

	const reading: TimerReading | null = timer ? readTimer(timer, now) : null;

	return {
		phase,
		timer,
		reading,
		notice,
		dismissNotice: () => setNotice(null),
		busy,
		begin,
		adopt,
		pause,
		pauseForLeaving,
		resume,
		keepReading,
		skip,
		finish,
		backToSetup,
		/** The open session's id, if any (for saving things that belong to it). */
		sessionId: () => sessionIdRef.current,
		/** Time read so far, in seconds, for showing in dialogs. */
		secondsNow: () =>
			timerRef.current ? readSeconds(timerRef.current, Date.now()) : 0,
	};
}
