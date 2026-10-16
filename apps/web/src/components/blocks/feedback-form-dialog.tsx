"use client";

import {
	contentPlainText,
	type FeedbackRatingStep,
	isFeedbackRatingStep,
} from "@bbrc/shared";
import { Checkbox } from "@bbrc/ui/components/checkbox";
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
import { FeedbackHalfStarRating } from "@/components/blocks/feedback-half-star-rating";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { invalidateFeedbackQueries } from "@/lib/feedback/invalidate-feedback-queries";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { orpc } from "@/utils/orpc";

const FEEDBACK_REVIEW_MAX_PLAIN = 500;

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
	const [isSpoiler, setIsSpoiler] = useState(false);

	useEffect(() => {
		if (!open) {
			setRating(4);
			setReview("");
			setIsSpoiler(false);
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
		const plain = contentPlainText(review).trim();
		if (plain.length < 1) {
			toast.error("Review must be at least 1 character long");
			return;
		}
		if (plain.length > FEEDBACK_REVIEW_MAX_PLAIN) {
			toast.error(
				`Review must be at most ${FEEDBACK_REVIEW_MAX_PLAIN} characters`,
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
			review,
			isSpoiler,
		});
	}

	const plainLength = contentPlainText(review).trim().length;

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
						<RichTextEditor
							instanceKey={open ? "feedback-open" : "feedback-closed"}
							id="feedback-dialog-review"
							value={review}
							onChange={setReview}
							maxPlainLength={FEEDBACK_REVIEW_MAX_PLAIN}
							minHeightClassName="min-h-[6rem]"
							placeholder="What did you think of the book?"
							disabled={createMutation.isPending}
						/>
						<FieldDescription>
							Required — between 1 and {FEEDBACK_REVIEW_MAX_PLAIN} characters.
						</FieldDescription>
					</Field>
					<Field>
						<div className="flex items-center gap-2">
							<Checkbox
								id="feedback-dialog-spoiler"
								checked={isSpoiler}
								onCheckedChange={(checked) => setIsSpoiler(checked === true)}
								disabled={createMutation.isPending}
							/>
							<FieldLabel htmlFor="feedback-dialog-spoiler" className="mb-0">
								Mark entire review as spoiler
							</FieldLabel>
						</div>
					</Field>
				</FieldGroup>
				<DialogFooter>
					<LoadingButton
						type="button"
						disabled={createMutation.isPending || plainLength < 1}
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
