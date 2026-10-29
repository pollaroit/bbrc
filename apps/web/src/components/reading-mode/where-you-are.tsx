"use client";

import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";
import { Button } from "@bbrc/ui/components/button";
import { Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useId } from "react";
import { usePagePosition } from "@/components/reading-mode/use-page-position";
import { bookCoverUrl } from "@/lib/book-cover";
import { useHoldRepeat } from "@/lib/reading-mode/use-hold-repeat";
import { cn } from "@/lib/utils";

function StepButton({
	direction,
	onStep,
	label,
}: {
	direction: "down" | "up";
	onStep: () => void;
	label: string;
}) {
	const handlers = useHoldRepeat(onStep);
	return (
		<Button
			type="button"
			variant="outline"
			className="size-14 shrink-0 touch-manipulation select-none"
			aria-label={label}
			{...handlers}
		>
			{direction === "down" ? <Minus aria-hidden /> : <Plus aria-hidden />}
		</Button>
	);
}

/**
 * Your book and your place in it: the cover, a progress bar, and a big stepper
 * for the page you are on. Press and hold to run through pages.
 */
export function WhereYouAre({
	reading,
	className,
}: {
	reading: ReadingItem;
	className?: string;
}) {
	const id = useId();
	const position = usePagePosition(reading);
	const percent = position.byPage
		? Math.round((position.value / Math.max(1, position.max)) * 100)
		: position.value;
	const cover = reading.edition?.coverUrl
		? reading.edition.coverUrl
		: bookCoverUrl(reading.edition?.coverId ?? reading.book.coverId, "M");

	return (
		<section
			aria-label="Where you are in the book"
			className={cn(
				"flex flex-col gap-4 border border-border bg-card p-4",
				className,
			)}
		>
			<div className="flex items-center gap-3">
				<span className="relative block aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
					{cover ? (
						<Image
							src={cover}
							alt=""
							fill
							className="object-cover"
							sizes="40px"
						/>
					) : null}
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<p className="truncate font-medium text-sm leading-tight">
						{reading.book.title}
					</p>
					<div className="h-1.5 w-full bg-muted" aria-hidden>
						<div
							className="h-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
							style={{ width: `${percent}%` }}
						/>
					</div>
					<p className="text-muted-foreground text-xs tabular-nums">
						{position.byPage
							? `Page ${position.value} of ${position.max}`
							: "Your progress"}{" "}
						· {percent}%
					</p>
				</div>
			</div>

			<div className="flex items-center justify-center gap-2">
				<StepButton
					direction="down"
					label={position.byPage ? "One page back" : "One percent back"}
					onStep={() => position.nudge(-1)}
				/>
				<div className="flex min-w-0 flex-1 flex-col items-center">
					<label htmlFor={id} className="sr-only">
						{position.byPage ? "Page you are on" : "Percent you have read"}
					</label>
					<input
						id={id}
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						autoComplete="off"
						value={position.value}
						onChange={(event) => {
							const digits = event.target.value.replace(/\D/g, "");
							position.set(digits === "" ? 0 : Number.parseInt(digits, 10));
						}}
						onFocus={(event) => event.target.select()}
						onBlur={() => void position.flush()}
						className="h-14 w-full min-w-0 border-0 bg-transparent text-center font-heading font-semibold text-4xl tabular-nums leading-none outline-none focus-visible:bg-muted/40"
					/>
					<span className="text-muted-foreground text-xs">
						{position.byPage ? `of ${position.max} pages` : "percent"}
					</span>
				</div>
				<StepButton
					direction="up"
					label={position.byPage ? "One page forward" : "One percent forward"}
					onStep={() => position.nudge(1)}
				/>
			</div>
		</section>
	);
}
