"use client";

import {
	type FeedbackRatingStep,
	formatFeedbackRating,
	isFeedbackRatingStep,
} from "@bbrc/shared";
import { cn } from "@bbrc/ui/lib/utils";
import { Star, StarHalf } from "lucide-react";

type FeedbackHalfStarRatingProps = {
	value: FeedbackRatingStep;
	onChange: (value: FeedbackRatingStep) => void;
	disabled?: boolean;
	className?: string;
};

function starVisualState(
	starIndex: number,
	value: number,
): "full" | "half" | "empty" {
	if (value >= starIndex) {
		return "full";
	}
	if (value >= starIndex - 0.5) {
		return "half";
	}
	return "empty";
}

export function FeedbackHalfStarRating({
	value,
	onChange,
	disabled,
	className,
}: FeedbackHalfStarRatingProps) {
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<fieldset className="m-0 min-w-0 border-0 p-0">
				<legend className="sr-only">
					Rating {formatFeedbackRating(value)} out of 5
				</legend>
				<div className="flex items-center gap-0.5">
					{[1, 2, 3, 4, 5].map((starIndex) => {
						const state = starVisualState(starIndex, value);
						return (
							<button
								key={starIndex}
								type="button"
								disabled={disabled}
								className="inline-flex size-9 items-center justify-center text-primary disabled:opacity-50"
								aria-label={`Set rating toward ${starIndex} stars (left half for ${starIndex - 0.5}, right for ${starIndex})`}
								onClick={(event) => {
									const rect = event.currentTarget.getBoundingClientRect();
									const leftHalf = event.clientX - rect.left < rect.width / 2;
									const next = leftHalf ? starIndex - 0.5 : starIndex;
									if (isFeedbackRatingStep(next)) {
										onChange(next);
									}
								}}
							>
								{state === "full" ? (
									<Star
										className="size-6 fill-primary text-primary"
										aria-hidden
									/>
								) : state === "half" ? (
									<StarHalf
										className="size-6 fill-primary text-primary"
										aria-hidden
									/>
								) : (
									<Star className="size-6 text-muted-foreground" aria-hidden />
								)}
							</button>
						);
					})}
				</div>
			</fieldset>
			<p className="text-muted-foreground text-xs tabular-nums">
				{formatFeedbackRating(value)} / 5
			</p>
		</div>
	);
}
