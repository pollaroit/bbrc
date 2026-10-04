"use client";

import { FeedbackSchema } from "@bbrc/schemas";
import { type FeedbackRatingStep, isFeedbackRatingStep } from "@bbrc/shared";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@bbrc/ui/components/field";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AutoGrowTextarea } from "@/components/blocks/auto-grow-textarea";
import { FeedbackHalfStarRating } from "@/components/blocks/feedback-half-star-rating";
import { invalidateFeedbackQueries } from "@/lib/feedback/invalidate-feedback-queries";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { orpc } from "@/utils/orpc";

type FeedbackFormDialogProps = {
	bookSlug: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** When false, stay on the current page after save (e.g. sitting page). */
	navigateToReview?: boolean;
};

export function FeedbackFormDialog({
	bookSlug,
	open,
	onOpenChange,
	navigateToReview = true,
}: FeedbackFormDialogProps) {
	const router = useRouter();
	const [rating, setRating] = useState<FeedbackRatingStep>(4);
	const [review, setReview] = useState("");

	useEffect(() => {
		if (!open) {
			setRating(4);
			setReview("");
		}
	}, [open]);

	const createMutation = useMutation(
		orpc.feedback.create.mutationOptions({
			onSuccess: async (result) => {
				toast.success(
					result.xpAwarded > 0
						? `Feedback saved (+${result.xpAwarded} XP)`
						: "Feedback saved",
				);
				await invalidateFeedbackQueries();
				await invalidateUserPointQueries();
				onOpenChange(false);
				if (navigateToReview) {
					router.push(`/books/${bookSlug}/feedbacks/${result.slug}` as Route);
				}
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	function handleSubmit() {
		const parsedReview = FeedbackSchema.shape.review.safeParse(review.trim());
		if (!parsedReview.success) {
			toast.error(
				parsedReview.error.issues[0]?.message ??
					"Review must be between 1 and 500 characters",
			);
			return;
		}

		if (!isFeedbackRatingStep(rating)) {
			toast.error("Choose a rating in half-star steps from 0 to 5");
			return;
		}

		createMutation.mutate({
			bookSlug,
			rating,
			review: parsedReview.data,
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Your club review</DialogTitle>
					<DialogDescription>
						Rate the book in half-star steps and share a short review for other
						members.
					</DialogDescription>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel>Rating</FieldLabel>
						<FeedbackHalfStarRating
							value={rating}
							onChange={setRating}
							disabled={createMutation.isPending}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="feedback-dialog-review">Review</FieldLabel>
						<AutoGrowTextarea
							id="feedback-dialog-review"
							value={review}
							onChange={(event) => setReview(event.target.value)}
							maxLength={500}
							rows={4}
							placeholder="What did you think of the book?"
							disabled={createMutation.isPending}
						/>
						<FieldDescription>
							Required — between 1 and 500 characters.
						</FieldDescription>
					</Field>
				</FieldGroup>
				<DialogFooter>
					<LoadingButton
						type="button"
						disabled={createMutation.isPending || review.trim().length < 1}
						loading={createMutation.isPending}
						onClick={handleSubmit}
					>
						Submit feedback
					</LoadingButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
