"use client";

import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";
import {
	collectUpdate,
	describePace,
	estimatePosition,
	learnPace,
	type PaceCollector,
	type PaceUnit,
	startCollecting,
} from "@bbrc/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSetReadingPace } from "@/lib/reading/use-reading";

/*
 * Learning a pace and moving the page by it, while a Reading Mode session runs.
 * The maths is in `@bbrc/shared` (`reading-pace-model.ts`); this is the glue.
 *
 * Learning: tap "Learn my pace", then keep updating your page as you read. Each
 * move forward becomes a sample (progress gained over active reading time). Finish
 * learning, or end the session, and the pace is worked out and saved on the reading.
 * Auto mode is a separate checkbox the member ticks themselves.
 */

type LearnState =
	| { kind: "idle" }
	| { kind: "learning"; collector: PaceCollector }
	| { kind: "failed" };

export function usePaceLearning(input: {
	reading: ReadingItem;
	unit: PaceUnit;
	/** The number the member sees now (page, percent or seconds). */
	currentValue: () => number;
	/** Active reading seconds in this session (pauses and breaks left out). */
	activeSeconds: () => number;
	sessionActive: boolean;
}) {
	const { reading, unit, currentValue, activeSeconds, sessionActive } = input;
	const savePace = useSetReadingPace();
	const [state, setState] = useState<LearnState>({ kind: "idle" });
	const stateRef = useRef(state);
	stateRef.current = state;

	const start = useCallback(() => {
		setState({
			kind: "learning",
			collector: startCollecting(currentValue(), activeSeconds()),
		});
		// Auto mode is off while the pace is being learned again.
		if (reading.autoPage) {
			savePace.mutate({ id: reading.id, autoPage: false });
		}
	}, [activeSeconds, currentValue, reading.autoPage, reading.id, savePace]);

	/** The member entered where they are. */
	const note = useCallback(
		(value: number) => {
			setState((current) =>
				current.kind === "learning"
					? {
							kind: "learning",
							collector: collectUpdate(
								current.collector,
								value,
								activeSeconds(),
							),
						}
					: current,
			);
		},
		[activeSeconds],
	);

	/** What finishing now would give: where they are now is the last sample. */
	const outcome = useCallback(() => {
		const current = stateRef.current;
		if (current.kind !== "learning") return null;
		const collector = collectUpdate(
			current.collector,
			currentValue(),
			activeSeconds(),
		);
		return learnPace(collector.samples, unit);
	}, [activeSeconds, currentValue, unit]);

	const finish = useCallback(() => {
		const result = outcome();
		if (!result) return;
		// Not enough yet: keep what was collected and let them carry on (the button
		// is disabled until there is enough; this is only the end of a session).
		if (!result.ok) {
			setState({ kind: "failed" });
			return;
		}
		setState({ kind: "idle" });
		savePace.mutate(
			{ id: reading.id, learnedPace: result.perMinute },
			{
				onSuccess: () =>
					toast.success(`Learned: ${describePace(result.perMinute, unit)}`),
			},
		);
	}, [outcome, reading.id, savePace, unit]);

	const cancel = useCallback(() => setState({ kind: "idle" }), []);

	// Ending the session while learning counts as finishing: they say where they are.
	const wasActive = useRef(sessionActive);
	useEffect(() => {
		if (wasActive.current && !sessionActive) finish();
		wasActive.current = sessionActive;
	}, [finish, sessionActive]);

	// The seconds move without a render of ours: look again every second while learning.
	const [, setTick] = useState(0);
	const learningNow = state.kind === "learning";
	useEffect(() => {
		if (!learningNow) return;
		const id = window.setInterval(() => setTick((tick) => tick + 1), 1000);
		return () => window.clearInterval(id);
	}, [learningNow]);

	return {
		/** True once finishing would give a pace. */
		ready: learningNow ? (outcome()?.ok ?? false) : false,
		learning: state.kind === "learning",
		failed: state.kind === "failed",
		stretches: state.kind === "learning" ? state.collector.samples.length : 0,
		start,
		note,
		finish,
		cancel,
		saving: savePace.isPending,
		setAuto: (autoPage: boolean) =>
			savePace.mutate({ id: reading.id, autoPage }),
	};
}

/**
 * While auto mode is on and the timer runs, the page shown is the last place the
 * member confirmed plus their pace times the active time since. It is a guess:
 * it is marked as estimated, saved only when the timer stops, and any number the
 * member types or steps to wins and starts the estimate again from there.
 */
export function useAutoPage(input: {
	reading: ReadingItem;
	unit: PaceUnit;
	max: number;
	/** The number last confirmed (typed, stepped or saved). */
	confirmed: number;
	activeSeconds: () => number;
	running: boolean;
	/** Saves an estimated number (marked as estimated). */
	commit: (value: number) => void;
}) {
	const { reading, unit, max, activeSeconds, running, commit } = input;
	const enabled = reading.autoPage && reading.learnedPace != null;
	const base = useRef({ value: input.confirmed, seconds: activeSeconds() });
	const [estimate, setEstimate] = useState<number | null>(null);
	const estimateRef = useRef<number | null>(null);

	/** The member said where they are: estimate from here. */
	const confirm = useCallback(
		(value: number) => {
			base.current = { value, seconds: activeSeconds() };
			estimateRef.current = null;
			setEstimate(null);
		},
		[activeSeconds],
	);

	// A server answer that is not an estimate of ours moves the baseline too.
	useEffect(() => {
		if (estimateRef.current == null) {
			base.current = { value: input.confirmed, seconds: activeSeconds() };
		}
	}, [input.confirmed, activeSeconds]);

	useEffect(() => {
		if (!enabled || !running) return;
		const perMinute = reading.learnedPace ?? 0;
		const tick = () => {
			const next = estimatePosition({
				baseline: base.current.value,
				perMinute,
				activeSecondsSinceBaseline: activeSeconds() - base.current.seconds,
				max,
			});
			if (next > base.current.value) {
				estimateRef.current = next;
				setEstimate(next);
			}
		};
		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, [enabled, running, reading.learnedPace, max, activeSeconds]);

	// The timer stopped (pause, break, end): save what we guessed, marked as estimated.
	useEffect(() => {
		if (running) return;
		const pending = estimateRef.current;
		if (pending != null) {
			commit(pending);
			base.current = { value: pending, seconds: activeSeconds() };
			estimateRef.current = null;
			setEstimate(null);
		}
	}, [running, commit, activeSeconds]);

	return {
		enabled,
		confirm,
		/** What to show instead of the saved number, or null; never shown past the maximum. */
		estimate: enabled ? estimate : null,
		unit,
	};
}
