"use client";

import { isFeedbackRatingStep } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { PenLine } from "lucide-react";
import { useState } from "react";
import {
	FeedbackFormDialog,
	type FeedbackFormInitialValues,
} from "@/components/blocks/feedback-form-dialog";
import { cn } from "@/lib/utils";

type FeedbackEditIconButtonProps = {
	bookSlug: string;
	rating: number;
	review: string;
	isSpoiler: boolean;
	feedbackSlug?: string;
	className?: string;
};

export function FeedbackEditIconButton({
	bookSlug,
	rating,
	review,
	isSpoiler,
	feedbackSlug,
	className,
}: FeedbackEditIconButtonProps) {
	const [open, setOpen] = useState(false);

	if (!isFeedbackRatingStep(rating)) {
		return null;
	}

	const initialValues: FeedbackFormInitialValues = {
		rating,
		review,
		isSpoiler,
	};

	return (
		<>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className={cn(
								"size-8 shrink-0 text-primary hover:text-primary",
								className,
							)}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								setOpen(true);
							}}
							aria-label="Edit feedback"
						/>
					}
				>
					<PenLine className="size-4" aria-hidden />
				</TooltipTrigger>
				<TooltipContent>Edit feedback</TooltipContent>
			</Tooltip>
			<FeedbackFormDialog
				bookSlug={bookSlug}
				open={open}
				onOpenChange={setOpen}
				mode="edit"
				initialValues={initialValues}
				feedbackSlug={feedbackSlug}
				navigateToReview={false}
			/>
		</>
	);
}
