"use client";

import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Minus, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useUpdateReadingProgress } from "@/lib/reading/use-reading";

/**
 * "I am on page N", with + and - and a box to type in. It saves a moment after
 * you stop changing it, through the same call as the reading card, so pace,
 * streaks and the card all follow.
 */
export function PageStepper({ reading }: { reading: ReadingItem }) {
	const id = useId();
	const update = useUpdateReadingProgress();
	const byPage = reading.totalPages != null && reading.currentPage != null;
	const max = byPage ? (reading.totalPages ?? 0) : 100;
	const saved = byPage ? (reading.currentPage ?? 0) : reading.percent;

	const [value, setValue] = useState(saved);
	const [typing, setTyping] = useState(false);
	const timer = useRef<number | null>(null);

	// Follow the server (and the card) when we are not the ones changing it.
	useEffect(() => {
		if (!typing) setValue(saved);
	}, [saved, typing]);

	useEffect(
		() => () => {
			if (timer.current) window.clearTimeout(timer.current);
		},
		[],
	);

	function change(next: number) {
		const clamped = Math.min(max, Math.max(0, Math.round(next)));
		setValue(clamped);
		setTyping(true);
		if (timer.current) window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			setTyping(false);
			if (clamped !== saved) {
				update.mutate({
					id: reading.id,
					...(byPage ? { page: clamped } : { percent: clamped }),
				});
			}
		}, 800);
	}

	return (
		<div className="flex items-center justify-center gap-2">
			<Button
				type="button"
				variant="outline"
				className="size-11"
				onClick={() => change(value - 1)}
				aria-label={byPage ? "One page back" : "One percent back"}
			>
				<Minus aria-hidden />
			</Button>
			<label htmlFor={id} className="flex items-center gap-2 text-sm">
				<span className="text-muted-foreground">
					{byPage ? "Page" : "Done"}
				</span>
				<Input
					id={id}
					type="number"
					inputMode="numeric"
					min={0}
					max={max}
					value={value}
					onChange={(event) => {
						const parsed = Number.parseInt(event.target.value, 10);
						if (Number.isFinite(parsed)) change(parsed);
					}}
					className="h-11 w-20 text-center text-base tabular-nums"
				/>
				<span className="text-muted-foreground tabular-nums">
					{byPage ? `of ${max}` : "%"}
				</span>
			</label>
			<Button
				type="button"
				variant="outline"
				className="size-11"
				onClick={() => change(value + 1)}
				aria-label={byPage ? "One page forward" : "One percent forward"}
			>
				<Plus aria-hidden />
			</Button>
		</div>
	);
}
