"use client";

import { isFeedbackRatingStep } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useQuery } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import { useMemo, useState } from "react";
import { FeedbackFormDialog } from "@/components/blocks/feedback-form-dialog";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type BookWriteFeedbackButtonProps = {
	bookSlug: string;
	variant?: "button" | "icon";
	mode?: "create" | "edit";
	className?: string;
	tooltipSide?: "top" | "right" | "bottom" | "left";
	navigateToReview?: boolean;
};

export function BookWriteFeedbackButton({
	bookSlug,
	variant = "button",
	mode = "create",
	className,
	tooltipSide = "top",
	navigateToReview = false,
}: BookWriteFeedbackButtonProps) {
	const [open, setOpen] = useState(false);
	const isEdit = mode === "edit";

	const stateQuery = useQuery({
		...orpc.feedback.getBookFeedbackState.queryOptions({
			input: bookSlug,
		}),
		enabled: open && isEdit,
	});

	const initialValues = useMemo(() => {
		const myFeedback = stateQuery.data?.myFeedback;
		if (!isEdit || !myFeedback || !isFeedbackRatingStep(myFeedback.rating)) {
			return undefined;
		}
		return {
			rating: myFeedback.rating,
			review: myFeedback.review,
			isSpoiler: myFeedback.isSpoiler,
			imageUrl: myFeedback.imageUrl ?? null,
		};
	}, [isEdit, stateQuery.data?.myFeedback]);

	const editReady =
		!isEdit ||
		(stateQuery.isSuccess && initialValues != null) ||
		stateQuery.isError;

	const label = isEdit ? "Edit feedback" : "Write feedback";

	const trigger =
		variant === "icon" ? (
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className={cn(
								"size-8 shrink-0",
								isEdit && "text-primary hover:text-primary",
								className,
							)}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								setOpen(true);
							}}
							aria-label={label}
							aria-pressed={isEdit}
						/>
					}
				>
					<PenLine className="size-4" aria-hidden />
				</TooltipTrigger>
				<TooltipContent side={tooltipSide}>{label}</TooltipContent>
			</Tooltip>
		) : (
			<Button
				type="button"
				size="sm"
				variant={isEdit ? "default" : "outline"}
				className={className}
				onClick={() => setOpen(true)}
			>
				{label}
			</Button>
		);

	return (
		<>
			{trigger}
			<FeedbackFormDialog
				bookSlug={bookSlug}
				open={open && editReady}
				onOpenChange={setOpen}
				mode={isEdit ? "edit" : "create"}
				initialValues={initialValues}
				feedbackSlug={stateQuery.data?.myFeedback?.slug}
				navigateToReview={navigateToReview}
			/>
		</>
	);
}
