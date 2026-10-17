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

export type FeedbackFormInitialValues = {
	rating: FeedbackRatingStep;
	review: string;
	isSpoiler: boolean;
};

type FeedbackFormDialogProps = {
	bookSlug: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode?: "create" | "edit";
	initialValues?: FeedbackFormInitialValues;
	/** When false, stay on the current page after save (e.g. sitting page). */
	navigateToReview?: boolean;
};

export function FeedbackFormDialog({
	bookSlug,
	open,
	onOpenChange,
	mode = "create",
	initialValues,
	navigateToReview = true,
}: FeedbackFormDialogProps) {
	const router = useRouter();
	const isEdit = mode === "edit";
	const [rating, setRating] = useState<FeedbackRatingStep>(4);
	const [review, setReview] = useState("");
	const [isSpoiler, setIsSpoiler] = useState(false);

	useEffect(() => {
		if (!open) {
			if (!isEdit) {
				setRating(4);
				setReview("");
				setIsSpoiler(false);
			}
			return;
		}

		if (isEdit && initialValues) {
			setRating(initialValues.rating);
			setReview(initialValues.review);
			setIsSpoiler(initialValues.isSpoiler);
		}
	}, [open, isEdit, initialValues]);

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

	const updateMutation = useMutation(
		orpc.feedback.update.mutationOptions({
			onSuccess: async (result) => {
				toast.success("Feedback updated");
				await invalidateFeedbackQueries();
				onOpenChange(false);
				if (navigateToReview) {
					router.push(`/books/${bookSlug}/feedbacks/${result.slug}` as Route);
				}
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const pending = createMutation.isPending || updateMutation.isPending;

	function handleSubmit() {
		const plain = contentPlainText(review).trim();
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

		const payload = {
			bookSlug,
			rating,
			review,
			isSpoiler,
		};

		if (isEdit) {
			updateMutation.mutate(payload);
			return;
		}

		createMutation.mutate(payload);
	}

	const plainLength = contentPlainText(review).trim().length;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit your review" : "Your club review"}
					</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Update your rating and review text. Slug and comments stay linked."
							: "Rate the book in half-star steps. Review text is optional."}
					</DialogDescription>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel>Rating</FieldLabel>
						<FeedbackHalfStarRating
							value={rating}
							onChange={setRating}
							disabled={pending}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="feedback-dialog-review">Review</FieldLabel>
						{open ? (
							<RichTextEditor
								instanceKey={
									isEdit ? "feedback-edit-open" : "feedback-create-open"
								}
								id="feedback-dialog-review"
								value={review}
								onChange={setReview}
								maxPlainLength={FEEDBACK_REVIEW_MAX_PLAIN}
								minHeightClassName="min-h-[6rem]"
								placeholder="What did you think of the book? (optional)"
								disabled={pending}
							/>
						) : null}
						<FieldDescription>
							Optional — up to {FEEDBACK_REVIEW_MAX_PLAIN} characters.
						</FieldDescription>
					</Field>
					<Field>
						<div className="flex items-center gap-2">
							<Checkbox
								id="feedback-dialog-spoiler"
								checked={isSpoiler}
								onCheckedChange={(checked) => setIsSpoiler(checked === true)}
								disabled={pending}
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
						disabled={pending || plainLength > FEEDBACK_REVIEW_MAX_PLAIN}
						loading={pending}
						onClick={handleSubmit}
					>
						{isEdit ? "Save changes" : "Submit feedback"}
					</LoadingButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
