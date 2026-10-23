"use client";

import type { GetBookFeedbackListOutput } from "@bbrc/api/modules/feedback/feedback.schema";
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
import { authClient } from "@/lib/auth-client";
import { invalidateFeedbackQueries } from "@/lib/feedback/invalidate-feedback-queries";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { createPendingSlug } from "@/lib/optimistic/infinite-lists";
import { orpc, queryClient } from "@/utils/orpc";

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
	const { data: session } = authClient.useSession();
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

	const listKey = orpc.feedback.getBookFeedbackList.key({
		input: { bookSlug },
	});
	const stateKey = orpc.feedback.getBookFeedbackState.queryKey({
		input: bookSlug,
	});

	type ReviewEntry = NonNullable<
		ReturnType<typeof queryClient.getQueryData<GetBookFeedbackListOutput>>
	>[number];

	/** Applies `change` to every cached review list of this book. */
	function updateReviewLists(change: (list: ReviewEntry[]) => ReviewEntry[]) {
		queryClient.setQueriesData<GetBookFeedbackListOutput>(
			{ queryKey: listKey },
			(old) => (Array.isArray(old) ? change(old) : old),
		);
	}

	const createMutation = useMutation(
		orpc.feedback.create.mutationOptions({
			scope: { id: `feedback-${bookSlug}` },
			onMutate: async (variables) => {
				const user = session?.user;
				const pendingSlug = createPendingSlug();
				const draft = { rating, review, isSpoiler };

				await Promise.all([
					queryClient.cancelQueries({ queryKey: listKey }),
					queryClient.cancelQueries({ queryKey: stateKey }),
				]);
				const previousState = queryClient.getQueryData(stateKey);

				if (user) {
					const entry: ReviewEntry = {
						slug: pendingSlug,
						authorId: user.id,
						username: user.username as string,
						name: user.name,
						image: user.image ?? null,
						rating: variables.rating,
						review: variables.review ?? "",
						isSpoiler: Boolean(variables.isSpoiler),
						createdAt: new Date(),
						likeCount: 0,
						likedByMe: false,
						commentCount: 0,
					};
					updateReviewLists((list) => [entry, ...list]);
				}

				queryClient.setQueryData(stateKey, (old) =>
					old
						? {
								...old,
								canSubmit: false,
								myFeedback: {
									slug: pendingSlug,
									rating: variables.rating,
									review: variables.review ?? "",
									isSpoiler: Boolean(variables.isSpoiler),
									createdAt: new Date(),
								},
							}
						: old,
				);

				onOpenChange(false);
				return { pendingSlug, draft, previousState };
			},
			onError: (error, _variables, context) => {
				if (context) {
					updateReviewLists((list) =>
						list.filter((entry) => entry.slug !== context.pendingSlug),
					);
					queryClient.setQueryData(stateKey, context.previousState);
					setRating(context.draft.rating);
					setReview(context.draft.review);
					setIsSpoiler(context.draft.isSpoiler);
					onOpenChange(true);
				}
				toast.error(error.message);
			},
			onSuccess: (result, _variables, context) => {
				updateReviewLists((list) =>
					list.map((entry) =>
						entry.slug === context.pendingSlug
							? { ...entry, slug: result.slug }
							: entry,
					),
				);
				queryClient.setQueryData(stateKey, (old) =>
					old?.myFeedback
						? { ...old, myFeedback: { ...old.myFeedback, slug: result.slug } }
						: old,
				);
				if (result.xpAwarded > 0) {
					toast.success(`Feedback saved (+${result.xpAwarded} XP)`);
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
				await Promise.all([
					queryClient.cancelQueries({ queryKey: listKey }),
					queryClient.cancelQueries({ queryKey: stateKey }),
				]);
				const previousState = queryClient.getQueryData(stateKey);
				const previousLists =
					queryClient.getQueriesData<GetBookFeedbackListOutput>({
						queryKey: listKey,
					});
				const mySlug = previousState?.myFeedback?.slug;

				if (mySlug) {
					updateReviewLists((list) =>
						list.map((entry) =>
							entry.slug === mySlug
								? {
										...entry,
										rating: variables.rating,
										review: variables.review ?? entry.review,
										isSpoiler: variables.isSpoiler ?? entry.isSpoiler,
									}
								: entry,
						),
					);
				}
				queryClient.setQueryData(stateKey, (old) =>
					old?.myFeedback
						? {
								...old,
								myFeedback: {
									...old.myFeedback,
									rating: variables.rating,
									review: variables.review ?? old.myFeedback.review,
									isSpoiler: variables.isSpoiler ?? old.myFeedback.isSpoiler,
								},
							}
						: old,
				);

				onOpenChange(false);
				return { previousState, previousLists };
			},
			onError: (error, _variables, context) => {
				if (context) {
					queryClient.setQueryData(stateKey, context.previousState);
					for (const [key, data] of context.previousLists) {
						queryClient.setQueryData(key, data);
					}
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
