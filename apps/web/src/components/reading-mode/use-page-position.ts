"use client";

import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";
import type { PaceUnit } from "@bbrc/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUpdateReadingProgress } from "@/lib/reading/use-reading";

const SAVE_AFTER_MS = 600;

/**
 * The page (or percent) you are on, edited without waiting for the server.
 *
 * Every tap changes the number on screen at once. The server hears about it a
 * moment after you stop, once, with the final number, one request at a time and
 * in order. Until then the server's older answer is ignored, so the number never
 * jumps back while you are still pressing.
 */
export function usePagePosition(reading: ReadingItem) {
	const update = useUpdateReadingProgress();
	const updateRef = useRef(update);
	updateRef.current = update;

	// Counted in listening time once the recording's length is known.
	const bySeconds = reading.trackByTime && reading.totalSeconds != null;
	const byPage =
		!bySeconds && reading.totalPages != null && reading.currentPage != null;
	const unit: PaceUnit = bySeconds ? "seconds" : byPage ? "pages" : "percent";
	const max = bySeconds
		? (reading.totalSeconds ?? 0)
		: byPage
			? (reading.totalPages ?? 0)
			: 100;
	const saved = bySeconds
		? (reading.currentSeconds ??
			Math.round((reading.percent / 100) * (reading.totalSeconds ?? 0)))
		: byPage
			? (reading.currentPage ?? 0)
			: reading.percent;

	const [value, setValue] = useState(saved);
	const latest = useRef(saved);
	const savedRef = useRef(saved);
	savedRef.current = saved;
	const dirty = useRef(false);
	/** The pending number came from the estimate, not from the member. */
	const estimated = useRef(false);
	const sending = useRef(false);
	const timer = useRef<number | null>(null);
	const readingId = reading.id;

	// Follow the server (and the card) only when we have nothing of our own pending.
	useEffect(() => {
		if (!dirty.current && !sending.current) {
			latest.current = saved;
			setValue(saved);
		}
	}, [saved]);

	const send = useCallback(async () => {
		if (timer.current) window.clearTimeout(timer.current);
		timer.current = null;
		if (sending.current || !dirty.current) return;

		const target = latest.current;
		const wasEstimated = estimated.current;
		dirty.current = false;
		if (target === savedRef.current) return;

		sending.current = true;
		try {
			await updateRef.current.mutateAsync({
				id: readingId,
				...(bySeconds
					? { seconds: target }
					: byPage
						? { page: target }
						: { percent: target }),
				...(wasEstimated ? { estimated: true } : {}),
			});
		} catch {
			// The card rolls the number back and shows the error; follow it.
			dirty.current = false;
			latest.current = savedRef.current;
			setValue(savedRef.current);
		} finally {
			sending.current = false;
			// More taps arrived while that was on its way: send the newest.
			if (dirty.current) void send();
		}
	}, [byPage, bySeconds, readingId]);

	const set = useCallback(
		(next: number, options?: { estimated?: boolean }) => {
			const clamped = Math.min(max, Math.max(0, Math.round(next)));
			latest.current = clamped;
			setValue(clamped);
			dirty.current = true;
			estimated.current = options?.estimated === true;
			if (timer.current) window.clearTimeout(timer.current);
			timer.current = window.setTimeout(() => void send(), SAVE_AFTER_MS);
			return clamped;
		},
		[max, send],
	);

	/** The number the member sees right now, without waiting for a render. */
	const current = useCallback(() => latest.current, []);

	const nudge = useCallback((by: number) => set(latest.current + by), [set]);

	// Do not lose a number if the page is hidden or left right after a tap.
	useEffect(() => {
		const flush = () => {
			if (dirty.current) void send();
		};
		const onHide = () => {
			if (document.visibilityState === "hidden") flush();
		};
		document.addEventListener("visibilitychange", onHide);
		window.addEventListener("pagehide", flush);
		return () => {
			document.removeEventListener("visibilitychange", onHide);
			window.removeEventListener("pagehide", flush);
			flush();
		};
	}, [send]);

	return {
		value,
		max,
		byPage,
		bySeconds,
		unit,
		set,
		nudge,
		current,
		flush: send,
		saving: update.isPending,
	};
}
