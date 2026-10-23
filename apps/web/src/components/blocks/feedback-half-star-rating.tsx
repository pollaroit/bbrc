"use client";

import {
	type FeedbackRatingStep,
	formatFeedbackRating,
	isFeedbackRatingStep,
} from "@bbrc/shared";
import { cn } from "@bbrc/ui/lib/utils";
import { Star } from "lucide-react";
import { useRef, useState } from "react";

type FeedbackHalfStarRatingProps = {
	value: FeedbackRatingStep;
	onChange: (value: FeedbackRatingStep) => void;
	disabled?: boolean;
	/** Shows a "Clear" action while a rating is set (0 means no rating). */
	allowClear?: boolean;
	className?: string;
};

const STAR_SIZE = 36;
const STAR_GAP = 4;

/** Plain words for each band, so the number means something at a glance. */
function describeRating(value: number): string {
	if (value <= 1) return "Not for me";
	if (value <= 2) return "Disappointing";
	if (value <= 3) return "It was okay";
	if (value <= 3.5) return "Good";
	if (value <= 4.5) return "Great";
	return "A favorite";
}

/**
 * Rating from the pointer position: each star is split into a left half
 * (x.5) and a right half (x), and the whole cell is the target, so a half
 * point is as easy to hit as a whole one. Gaps snap to the nearer star.
 */
function ratingAt(clientX: number, track: HTMLElement): FeedbackRatingStep {
	const x = clientX - track.getBoundingClientRect().left;
	const pitch = STAR_SIZE + STAR_GAP;
	const index = Math.min(4, Math.max(0, Math.floor(x / pitch)));
	const within = Math.min(1, Math.max(0, (x - index * pitch) / STAR_SIZE));
	const next = index + (within < 0.5 ? 0.5 : 1);
	return (isFeedbackRatingStep(next) ? next : 0.5) as FeedbackRatingStep;
}

function fillShare(starIndex: number, value: number): number {
	return Math.min(1, Math.max(0, value - (starIndex - 1)));
}

export function FeedbackHalfStarRating({
	value,
	onChange,
	disabled,
	allowClear = false,
	className,
}: FeedbackHalfStarRatingProps) {
	const trackRef = useRef<HTMLDivElement>(null);
	const draggingRef = useRef(false);
	const [hover, setHover] = useState<FeedbackRatingStep | null>(null);

	const shown = hover ?? value;
	const hasValue = shown > 0;

	function step(delta: number) {
		const next = Math.min(5, Math.max(0, value + delta));
		if (isFeedbackRatingStep(next)) {
			onChange(next);
		}
	}

	return (
		<div
			className={cn(
				"flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5",
				className,
			)}
		>
			<div
				ref={trackRef}
				role="slider"
				tabIndex={disabled ? -1 : 0}
				aria-label="Rating"
				aria-valuemin={0}
				aria-valuemax={5}
				aria-valuenow={value}
				aria-valuetext={
					value > 0
						? `${formatFeedbackRating(value)} out of 5, ${describeRating(value)}`
						: "No rating"
				}
				aria-disabled={disabled}
				className={cn(
					"flex w-fit cursor-pointer touch-none select-none items-center outline-none focus-visible:ring-2 focus-visible:ring-warning/60 focus-visible:ring-offset-2",
					disabled && "pointer-events-none opacity-50",
				)}
				style={{ gap: STAR_GAP }}
				onPointerDown={(event) => {
					const track = trackRef.current;
					if (!track || disabled) return;
					track.setPointerCapture(event.pointerId);
					draggingRef.current = true;
					onChange(ratingAt(event.clientX, track));
				}}
				onPointerMove={(event) => {
					const track = trackRef.current;
					if (!track || disabled) return;
					const next = ratingAt(event.clientX, track);
					if (draggingRef.current) {
						onChange(next);
					} else if (event.pointerType === "mouse") {
						setHover(next);
					}
				}}
				onPointerUp={() => {
					draggingRef.current = false;
				}}
				onPointerCancel={() => {
					draggingRef.current = false;
					setHover(null);
				}}
				onPointerLeave={() => setHover(null)}
				onKeyDown={(event) => {
					if (event.key === "ArrowRight" || event.key === "ArrowUp") {
						event.preventDefault();
						step(0.5);
					} else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
						event.preventDefault();
						step(-0.5);
					} else if (event.key === "Home") {
						event.preventDefault();
						onChange(0);
					} else if (event.key === "End") {
						event.preventDefault();
						onChange(5);
					}
				}}
			>
				{[1, 2, 3, 4, 5].map((starIndex) => {
					const share = fillShare(starIndex, shown);
					return (
						<span
							key={starIndex}
							className="relative block"
							style={{ width: STAR_SIZE, height: STAR_SIZE }}
							aria-hidden
						>
							<Star
								className="absolute inset-0 size-full text-muted-foreground/35"
								strokeWidth={1.5}
							/>
							<Star
								className={cn(
									"absolute inset-0 size-full fill-warning text-warning transition-opacity",
									hover != null && "opacity-70",
								)}
								strokeWidth={1.5}
								style={{ clipPath: `inset(0 ${(1 - share) * 100}% 0 0)` }}
							/>
						</span>
					);
				})}
			</div>

			<div className="flex min-w-0 items-baseline gap-3" aria-live="polite">
				{hasValue ? (
					<>
						<p className="tabular-nums leading-none">
							<span className="font-semibold text-2xl">
								{formatFeedbackRating(shown)}
							</span>
							<span className="ml-1 text-muted-foreground text-sm">/ 5</span>
						</p>
						<p className="truncate text-muted-foreground text-sm">
							{describeRating(shown)}
						</p>
					</>
				) : (
					<p className="text-muted-foreground text-sm">
						Tap a star, or drag across them
					</p>
				)}
				{allowClear && value > 0 && !disabled ? (
					<button
						type="button"
						className="text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
						onClick={() => onChange(0)}
					>
						Clear
					</button>
				) : null}
			</div>
		</div>
	);
}
