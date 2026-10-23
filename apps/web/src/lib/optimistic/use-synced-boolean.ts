"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseSyncedBooleanOptions<TResult> = {
	/** Latest known server truth (props or cache). Adopted whenever nothing is pending. */
	serverValue: boolean;
	/** Sends the wanted final state to the server. Must be idempotent. */
	send: (desired: boolean) => Promise<TResult>;
	/** The state the server confirmed in its reply. */
	confirmedFrom: (result: TResult) => boolean;
	onConfirmed?: (result: TResult) => void;
	onError?: (error: unknown) => void;
	/** Quiet period after the last click before anything is sent. */
	debounceMs?: number;
};

/**
 * Optimistic on/off control that survives fast clicking.
 *
 * Every click flips the UI at once. Only the *final* wanted state is sent,
 * after the clicks pause, and never two requests at the same time: a click
 * that lands while a request is in flight is picked up right after it
 * returns. Five quick clicks therefore end as one request, and a slow reply
 * can never overwrite a newer click. A failed request rolls the UI back to
 * the last state the server confirmed.
 */
export function useSyncedBoolean<TResult>(
	options: UseSyncedBooleanOptions<TResult>,
) {
	const { serverValue, debounceMs = 250 } = options;
	const [value, setValue] = useState(serverValue);
	const wantedRef = useRef(serverValue);
	const confirmedRef = useRef(serverValue);
	const busyRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const optionsRef = useRef(options);
	optionsRef.current = options;

	// Adopt fresher server truth, but never while a click is still unsettled.
	useEffect(() => {
		if (busyRef.current || timerRef.current != null) {
			return;
		}
		confirmedRef.current = serverValue;
		wantedRef.current = serverValue;
		setValue(serverValue);
	}, [serverValue]);

	const flush = useCallback(async () => {
		timerRef.current = undefined;
		if (busyRef.current) {
			return;
		}

		busyRef.current = true;
		try {
			while (wantedRef.current !== confirmedRef.current) {
				const desired = wantedRef.current;
				try {
					const result = await optionsRef.current.send(desired);
					confirmedRef.current = optionsRef.current.confirmedFrom(result);
					optionsRef.current.onConfirmed?.(result);
				} catch (error) {
					wantedRef.current = confirmedRef.current;
					setValue(confirmedRef.current);
					optionsRef.current.onError?.(error);
					break;
				}
			}
		} finally {
			busyRef.current = false;
		}
	}, []);

	const set = useCallback(
		(next: boolean) => {
			wantedRef.current = next;
			setValue(next);
			if (timerRef.current != null) {
				clearTimeout(timerRef.current);
			}
			timerRef.current = setTimeout(() => {
				void flush();
			}, debounceMs);
		},
		[flush, debounceMs],
	);

	const toggle = useCallback(() => {
		set(!wantedRef.current);
	}, [set]);

	// Don't lose a click made just before navigating away.
	useEffect(
		() => () => {
			if (timerRef.current != null) {
				clearTimeout(timerRef.current);
				timerRef.current = undefined;
			}
			if (wantedRef.current !== confirmedRef.current && !busyRef.current) {
				void flush();
			}
		},
		[flush],
	);

	return { value, set, toggle };
}
