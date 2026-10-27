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
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FeedbackHalfStarRating } from "@/components/blocks/feedback-half-star-rating";
import {
	ReviewImageField,
	uploadReviewImage,
} from "@/components/blocks/review-image-field";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { invalidateFeedbackQueries } from "@/lib/feedback/invalidate-feedback-queries";
import {
	applyFeedbackCreate,
	applyFeedbackUpdate,
	confirmFeedbackCreate,
	myFeedbackSlug,
	restoreFeedbackQueries,
	snapshotFeedbackQueries,
} from "@/lib/feedback/optimistic-feedback";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { createPendingSlug } from "@/lib/optimistic/infinite-lists";
import { orpc } from "@/utils/orpc";

const FEEDBACK_REVIEW_MAX_PLAIN = 500;

export type FeedbackFormInitialValues = {
	rating: FeedbackRatingStep;
	review: string;
	isSpoiler: boolean;
	/** The review's current image, when it has one. */
	imageUrl?: string | null;
};

type FeedbackFormDialogProps = {
	bookSlug: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode?: "create" | "edit";
	initialValues?: FeedbackFormInitialValues;
	/** Slug of the review being edited, so every cached view of it can update. */
	feedbackSlug?: string;
	/** When false, stay on the current page after save (e.g. sitting page). */
	navigateToReview?: boolean;
};

export function FeedbackFormDialog({
	bookSlug,
	open,
	onOpenChange,
	mode = "create",
	initialValues,
	feedbackSlug,
	navigateToReview = true,
}: FeedbackFormDialogProps) {
	const t = useTranslations("books");
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const isEdit = mode === "edit";
	const [rating, setRating] = useState<FeedbackRatingStep>(4);
	const [review, setReview] = useState("");
	const [isSpoiler, setIsSpoiler] = useState(false);
	const [imageFile, setImageFile] = useState<File | null>(null);

	useEffect(() => {
		if (!open) {
			if (!isEdit) {
				setRating(4);
				setReview("");
				setIsSpoiler(false);
				setImageFile(null);
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
			scope: { id: `feedback-${bookSlug}` },
			onMutate: async (variables) => {
				const user = session?.user;
				const pendingSlug = createPendingSlug();
				const draft = { rating, review, isSpoiler, imageFile };
				const snapshot = await snapshotFeedbackQueries();

				if (user) {
					applyFeedbackCreate({
						bookSlug,
						pendingSlug,
						author: {
							id: user.id,
							username: user.username as string,
							name: user.name,
							image: user.image ?? null,
						},
						values: {
							rating: variables.rating,
							review: variables.review ?? "",
							isSpoiler: Boolean(variables.isSpoiler),
						},
					});
				}

				onOpenChange(false);
				return { pendingSlug, draft, snapshot };
			},
			onError: (error, _variables, context) => {
				if (context) {
					restoreFeedbackQueries(context.snapshot);
					setRating(context.draft.rating);
					setReview(context.draft.review);
					setIsSpoiler(context.draft.isSpoiler);
					setImageFile(context.draft.imageFile);
					onOpenChange(true);
				}
				toast.error(error.message);
			},
			onSuccess: (result, _variables, context) => {
				confirmFeedbackCreate(bookSlug, context.pendingSlug, result.slug);
				if (context.draft.imageFile) {
					void uploadReviewImage(context.draft.imageFile, result.slug);
				}
				if (result.xpAwarded > 0) {
					toast.success(t("feedbackForm.saved", { xp: result.xpAwarded }));
				}
				void invalidateUserPointQueries();
				if (navigateToReview) {
					router.push(`/books/${bookSlug}/feedbacks/${result.slug}` as Route);
				}
				router.refresh();
			},
			onSettled: () => {
				void invalidateFeedbackQueries();
			},
		}),
	);

	const updateMutation = useMutation(
		orpc.feedback.update.mutationOptions({
			scope: { id: `feedback-${bookSlug}` },
			onMutate: async (variables) => {
				const snapshot = await snapshotFeedbackQueries();
				const targetSlug = feedbackSlug ?? myFeedbackSlug(bookSlug);

				if (targetSlug) {
					applyFeedbackUpdate({
						bookSlug,
						feedbackSlug: targetSlug,
						values: {
							rating: variables.rating,
							review: variables.review ?? initialValues?.review ?? "",
							isSpoiler:
								variables.isSpoiler ?? initialValues?.isSpoiler ?? false,
						},
					});
				}

				onOpenChange(false);
				return { snapshot };
			},
			onError: (error, _variables, context) => {
				if (context) {
					restoreFeedbackQueries(context.snapshot);
					onOpenChange(true);
				}
				toast.error(error.message);
			},
			onSuccess: (result) => {
				if (navigateToReview) {
					router.push(`/books/${bookSlug}/feedbacks/${result.slug}` as Route);
				}
				router.refresh();
			},
			onSettled: () => {
				void invalidateFeedbackQueries();
			},
		}),
	);

	const pending = false;

	function handleSubmit() {
		if (createMutation.isPending || updateMutation.isPending) return;
		const plain = contentPlainText(review).trim();
		if (plain.length > FEEDBACK_REVIEW_MAX_PLAIN) {
			toast.error(
				t("feedbackForm.tooLong", { max: FEEDBACK_REVIEW_MAX_PLAIN }),
			);
			return;
		}

		if (!isFeedbackRatingStep(rating)) {
			toast.error(t("feedbackForm.badRating"));
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
						{isEdit ? t("feedbackForm.titleEdit") : t("feedbackForm.titleNew")}
					</DialogTitle>
					<DialogDescription>
						{isEdit ? t("feedbackForm.descEdit") : t("feedbackForm.descNew")}
					</DialogDescription>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel>{t("feedbackForm.rating")}</FieldLabel>
						<FeedbackHalfStarRating
							value={rating}
							onChange={setRating}
							disabled={pending}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="feedback-dialog-review">
							{t("feedbackForm.review")}
						</FieldLabel>
						{open ? (
							<RichTextEditor
								instanceKey={
									isEdit ? "feedback-edit-open" : "feedback-create-open"
								}
								id="feedback-dialog-review"
								value={review}
								onChange={setReview}
								onSubmitShortcut={handleSubmit}
								maxPlainLength={FEEDBACK_REVIEW_MAX_PLAIN}
								minHeightClassName="min-h-[6rem]"
								placeholder={t("feedbackForm.placeholder")}
								disabled={pending}
							/>
						) : null}
						<FieldDescription>
							{t("feedbackForm.optional", { max: FEEDBACK_REVIEW_MAX_PLAIN })}
						</FieldDescription>
					</Field>
					<Field>
						<FieldLabel>{t("feedbackForm.photo")}</FieldLabel>
						{isEdit ? (
							<ReviewImageField
								mode="edit"
								feedbackSlug={feedbackSlug ?? myFeedbackSlug(bookSlug)}
								currentUrl={initialValues?.imageUrl}
								disabled={pending}
							/>
						) : (
							<ReviewImageField
								mode="create"
								file={imageFile}
								onFileChange={setImageFile}
								disabled={pending}
							/>
						)}
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
								{t("feedbackForm.spoiler")}
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
						{isEdit ? t("feedbackForm.saveChanges") : t("feedbackForm.submit")}
					</LoadingButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
