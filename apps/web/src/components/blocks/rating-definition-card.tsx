"use client";

import {
	type FeedbackRatingStep,
	formatFeedbackRating,
	RATING_DEFINITION_STEPS,
	resolveRatingDefinition,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@bbrc/ui/components/sheet";
import { Info, Star } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRatingDefinitions } from "@/lib/rating/use-rating-definitions";
import { cn } from "@/lib/utils";

/** Five small stars filled to the rating (halves included) and the number, the same everywhere a rating is named. */
export function MiniStars({
	rating,
	className,
}: {
	rating: number;
	className?: string;
}) {
	return (
		<span
			className={cn("inline-flex items-center gap-1.5 tabular-nums", className)}
			role="img"
			aria-label={`${formatFeedbackRating(rating)} out of 5`}
		>
			<span className="flex gap-px" aria-hidden>
				{[1, 2, 3, 4, 5].map((index) => {
					const share = Math.min(1, Math.max(0, rating - (index - 1)));
					return (
						<span key={index} className="relative block size-3.5">
							<Star
								className="absolute inset-0 size-full text-muted-foreground/35"
								strokeWidth={1.5}
							/>
							<Star
								className="absolute inset-0 size-full fill-warning text-warning"
								strokeWidth={1.5}
								style={{ clipPath: `inset(0 ${(1 - share) * 100}% 0 0)` }}
							/>
						</span>
					);
				})}
			</span>
			<span className="font-semibold text-sm">
				{formatFeedbackRating(rating)}
			</span>
		</span>
	);
}

/** Every rating with what it means to this member, opened from the info icon. */
export function RatingGuideSheet({
	current,
	className,
	defaultOpen,
}: {
	defaultOpen?: boolean;
	/** The rating being chosen, highlighted in the list. */
	current?: FeedbackRatingStep | null;
	className?: string;
}) {
	const { overrides, signedIn } = useRatingDefinitions();

	return (
		<Sheet defaultOpen={defaultOpen}>
			<SheetTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className={cn("text-muted-foreground", className)}
						aria-label="What every rating means"
						title="What every rating means"
					/>
				}
			>
				<Info aria-hidden />
			</SheetTrigger>
			<SheetContent className="gap-0 sm:max-w-md">
				<SheetHeader className="border-border border-b">
					<SheetTitle>What every rating means</SheetTitle>
					<SheetDescription>
						A guide to keep your ratings consistent. You can rewrite any of
						these in{" "}
						<Link
							href={"/settings/preferences#ratings" as Route}
							className="text-foreground underline underline-offset-4"
						>
							Preferences
						</Link>
						{signedIn ? "." : " after you sign in."}
					</SheetDescription>
				</SheetHeader>
				{/* A ladder: the rail runs from 5 down to 0, and the rating being chosen is marked on it. */}
				<ol className="relative flex flex-1 flex-col overflow-y-auto py-2">
					{RATING_DEFINITION_STEPS.map((rating) => {
						const definition = resolveRatingDefinition(rating, overrides);
						const active = current === rating;
						return (
							<li
								key={rating}
								className={cn(
									"relative flex flex-col gap-1 py-3 ps-11 pe-4",
									active && "bg-muted/60",
								)}
								aria-current={active ? "true" : undefined}
							>
								<span
									aria-hidden
									className="absolute inset-y-0 start-6 w-px bg-border"
								/>
								<span
									aria-hidden
									className={cn(
										"absolute start-[1.2rem] top-[1.05rem] size-2.5 border bg-background",
										active
											? "border-foreground bg-foreground"
											: "border-border",
									)}
								/>
								<p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
									<MiniStars rating={rating} />
									<span className="font-semibold text-sm">
										{definition.label}
									</span>
									{definition.custom ? (
										<span className="border border-border px-1 text-2xs text-muted-foreground">
											Your wording
										</span>
									) : null}
								</p>
								<p className="text-muted-foreground text-sm leading-relaxed">
									{definition.text}
								</p>
							</li>
						);
					})}
				</ol>
			</SheetContent>
		</Sheet>
	);
}

/**
 * The definition of the rating being chosen, so a member rates against their own words.
 * Follows the stars while they move; the info icon opens the whole list.
 */
export function RatingDefinitionCard({
	rating,
	className,
}: {
	rating: FeedbackRatingStep;
	className?: string;
}) {
	const { overrides } = useRatingDefinitions();
	const definition = resolveRatingDefinition(rating, overrides);

	return (
		<div
			className={cn(
				"flex flex-col gap-1 border border-border border-l-2 border-l-warning bg-muted/30 py-2.5 ps-3 pe-1.5",
				className,
			)}
		>
			<div className="flex items-center gap-2">
				<p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-muted-foreground text-xs">
					{definition.custom
						? `Your definition of ${formatFeedbackRating(rating)}`
						: `What ${formatFeedbackRating(rating)} means`}
					{definition.custom ? (
						<span className="border border-border px-1 text-2xs">
							Your wording
						</span>
					) : null}
				</p>
				<RatingGuideSheet current={rating} />
			</div>
			<p
				className="pe-1.5 text-foreground/90 text-sm leading-relaxed"
				aria-live="polite"
			>
				{definition.text}
			</p>
		</div>
	);
}
