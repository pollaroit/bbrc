"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RunUntilDoneState =
	| "idle"
	| "running"
	| "stopping"
	| "paused"
	| "done";

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1500, 4000, 9000];
/** Two answers in a row that did nothing and are not "done": stop instead of looping forever. */
const MAX_STALLED = 2;

export type RunUntilDoneOptions<Result> = {
	/** One request. Called again and again until `isDone` says so. */
	step: () => Promise<Result>;
	isDone: (result: Result) => boolean;
	/** Did the step change anything? A step that did not, twice in a row, pauses the loop. */
	madeProgress: (result: Result) => boolean;
	/** Called after every answer, in order. */
	onResult?: (result: Result) => void;
	/** Called once when the loop ends for any reason (done, stopped or paused). */
	onSettled?: () => void;
};

export type RunUntilDoneControls = {
	state: RunUntilDoneState;
	/** Seconds since the loop started (frozen when it ends). */
	elapsedSeconds: number;
	/** Requests answered since the loop started. */
	steps: number;
	/** Why it paused (a request kept failing, or nothing moved). */
	pauseReason: string | null;
	start: () => void;
	/** Finish the request in flight, then stop. */
	stop: () => void;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs a resumable server step over and over until it reports it is finished. A failing request
 * is tried again (a few times, with a growing pause) before the loop pauses; Stop never cuts a
 * request off, it ends the loop after the current one.
 */
export function useRunUntilDone<Result>(
	options: RunUntilDoneOptions<Result>,
): RunUntilDoneControls {
	const [state, setState] = useState<RunUntilDoneState>("idle");
	const [steps, setSteps] = useState(0);
	const [pauseReason, setPauseReason] = useState<string | null>(null);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const optionsRef = useRef(options);
	const stopRef = useRef(false);
	const runningRef = useRef(false);
	const startedAt = useRef(0);

	useEffect(() => {
		optionsRef.current = options;
	});

	useEffect(() => {
		if (state !== "running" && state !== "stopping") return;
		const timer = setInterval(
			() =>
				setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000)),
			1000,
		);
		return () => clearInterval(timer);
	}, [state]);

	const start = useCallback(() => {
		if (runningRef.current) return;
		runningRef.current = true;
		stopRef.current = false;
		startedAt.current = Date.now();
		setElapsedSeconds(0);
		setSteps(0);
		setPauseReason(null);
		setState("running");

		void (async () => {
			let stalled = 0;
			let ending: RunUntilDoneState = "idle";
			let reason: string | null = null;
			try {
				while (true) {
					if (stopRef.current) {
						ending = "idle";
						break;
					}
					const { step, isDone, madeProgress, onResult } = optionsRef.current;
					let result: Result | undefined;
					let lastError = "";
					for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
						try {
							result = await step();
							break;
						} catch (error) {
							lastError =
								error instanceof Error && error.message
									? error.message
									: "The request failed.";
							if (attempt < MAX_RETRIES) {
								await wait(RETRY_DELAYS_MS[attempt] ?? 9000);
								if (stopRef.current) break;
							}
						}
					}
					if (result === undefined) {
						if (stopRef.current) {
							ending = "idle";
							break;
						}
						ending = "paused";
						reason = `${lastError} It was tried ${MAX_RETRIES + 1} times. Press Resume to continue where it stopped.`;
						break;
					}
					setSteps((count) => count + 1);
					onResult?.(result);
					if (isDone(result)) {
						ending = "done";
						break;
					}
					stalled = madeProgress(result) ? 0 : stalled + 1;
					if (stalled >= MAX_STALLED) {
						ending = "paused";
						reason =
							"The last runs did not change anything, so it paused. Check the errors below, then Resume.";
						break;
					}
				}
			} finally {
				runningRef.current = false;
				setPauseReason(reason);
				setState(ending);
				optionsRef.current.onSettled?.();
			}
		})();
	}, []);

	const stop = useCallback(() => {
		stopRef.current = true;
		setState((current) => (current === "running" ? "stopping" : current));
	}, []);

	return { state, elapsedSeconds, steps, pauseReason, start, stop };
}

export function formatElapsed(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return minutes > 0 ? `${minutes} min ${seconds} s` : `${seconds} s`;
}
