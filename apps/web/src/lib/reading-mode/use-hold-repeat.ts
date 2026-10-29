"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Press once to step once; keep pressing and it repeats, faster after a moment.
 * Spread the result on a button. Keyboard (Enter / Space) steps once per press.
 */
export function useHoldRepeat(step: () => void) {
	const stepRef = useRef(step);
	stepRef.current = step;
	const delay = useRef<number | null>(null);
	const repeat = useRef<number | null>(null);
	const suppressClick = useRef(false);

	const stop = useCallback(() => {
		if (delay.current) window.clearTimeout(delay.current);
		if (repeat.current) window.clearInterval(repeat.current);
		delay.current = null;
		repeat.current = null;
	}, []);

	useEffect(() => stop, [stop]);

	return {
		onPointerDown: (event: React.PointerEvent) => {
			if (event.button !== 0) return;
			suppressClick.current = true;
			stepRef.current();
			stop();
			delay.current = window.setTimeout(() => {
				repeat.current = window.setInterval(() => stepRef.current(), 85);
			}, 380);
		},
		onPointerUp: stop,
		onPointerLeave: stop,
		onPointerCancel: stop,
		onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
		// A mouse or touch press already stepped on pointer down; only a keyboard "click" steps here.
		onClick: () => {
			if (suppressClick.current) {
				suppressClick.current = false;
				return;
			}
			stepRef.current();
		},
	};
}
