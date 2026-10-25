"use client";

import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Slider } from "@bbrc/ui/components/slider";
import { useEffect, useId, useState } from "react";
import { paceText, paceToneClass } from "@/lib/reading/pace-text";
import { useUpdateReadingProgress } from "@/lib/reading/use-reading";
import { cn } from "@/lib/utils";

/*
 * The editable progress bar of one reading.
 *
 * <ReadingProgressControl reading={item} />
 *   - drag the bar, or use the arrow keys, to move it (saved when you let go)
 *   - type "page N" when the edition's pages are known
 *   - +10 / +25 pages (or +5% / +10%) buttons for a quick nudge
 *   - the pace line against the sitting's deadline, when there is one
 * Every change shows at once and is rolled back if the server refuses.
 */

type Props = {
	reading: ReadingItem;
	className?: string;
	/** Hide the pace sentence (it is shown elsewhere). */
	hidePace?: boolean;
};

export function ReadingProgressControl({
	reading,
	className,
	hidePace,
}: Props) {
	const uid = useId();
	const update = useUpdateReadingProgress();
	const [dragging, setDragging] = useState<number | null>(null);
	const [pageText, setPageText] = useState(
		reading.currentPage != null ? String(reading.currentPage) : "",
	);

	// Follow the server's answer (and other screens) when we are not typing.
	useEffect(() => {
		setPageText(reading.currentPage != null ? String(reading.currentPage) : "");
	}, [reading.currentPage]);

	const pages = reading.totalPages;
	const byPage = pages != null && reading.currentPage != null;
	const shownPercent = dragging ?? reading.percent;
	const shownPage = byPage
		? dragging != null
			? Math.round((dragging / 100) * (pages ?? 0))
			: (reading.currentPage ?? 0)
		: null;

	const commitPercent = (percent: number) => {
		setDragging(null);
		if (percent === reading.percent) return;
		update.mutate({ id: reading.id, percent });
	};

	const commitPage = (page: number) => {
		if (pages == null) return;
		const clamped = Math.max(0, Math.min(pages, page));
		setPageText(String(clamped));
		if (clamped === reading.currentPage) return;
		update.mutate({ id: reading.id, page: clamped });
	};

	const nudges = byPage
		? [
				{
					label: "+10 pages",
					apply: () => commitPage((reading.currentPage ?? 0) + 10),
				},
				{
					label: "+25 pages",
					apply: () => commitPage((reading.currentPage ?? 0) + 25),
				},
			]
		: [
				{
					label: "+5%",
					apply: () => commitPercent(Math.min(100, reading.percent + 5)),
				},
				{
					label: "+10%",
					apply: () => commitPercent(Math.min(100, reading.percent + 10)),
				},
			];

	const pace = hidePace ? null : paceText(reading.pace);

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<div className="flex items-baseline justify-between gap-3">
				<p
					className="font-heading font-semibold text-2xl tabular-nums leading-none"
					aria-live="polite"
				>
					{shownPercent}
					<span className="font-normal text-base text-muted-foreground">%</span>
				</p>
				{pages != null && shownPage != null ? (
					<p className="text-muted-foreground text-sm tabular-nums">
						page {shownPage} of {pages}
					</p>
				) : (
					<p className="text-muted-foreground text-sm">
						pages not set for this edition
					</p>
				)}
			</div>

			<Slider
				value={shownPercent}
				min={0}
				max={100}
				step={1}
				onValueChange={(value) =>
					setDragging(Array.isArray(value) ? (value[0] ?? 0) : value)
				}
				onValueCommitted={(value) =>
					commitPercent(Array.isArray(value) ? (value[0] ?? 0) : value)
				}
				aria-label="Reading progress"
			/>

			<div className="flex flex-wrap items-center gap-2">
				{byPage ? (
					<form
						className="flex items-center gap-1.5"
						onSubmit={(event) => {
							event.preventDefault();
							const parsed = Number.parseInt(pageText, 10);
							if (Number.isFinite(parsed)) commitPage(parsed);
						}}
					>
						<label
							htmlFor={`${uid}-page`}
							className="text-muted-foreground text-sm"
						>
							I'm on page
						</label>
						<Input
							id={`${uid}-page`}
							inputMode="numeric"
							value={pageText}
							onChange={(event) =>
								setPageText(event.target.value.replace(/\D/g, ""))
							}
							onBlur={() => {
								const parsed = Number.parseInt(pageText, 10);
								if (Number.isFinite(parsed)) commitPage(parsed);
							}}
							className="h-8 w-20 tabular-nums"
						/>
					</form>
				) : null}
				<div className="flex gap-1.5">
					{nudges.map((nudge) => (
						<Button
							key={nudge.label}
							type="button"
							size="sm"
							variant="outline"
							onClick={nudge.apply}
						>
							{nudge.label}
						</Button>
					))}
				</div>
			</div>

			{pace ? (
				<p className={cn("text-sm leading-snug", paceToneClass[pace.tone])}>
					{pace.text}
				</p>
			) : null}
		</div>
	);
}
