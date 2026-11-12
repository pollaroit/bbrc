"use client";

import { isFeedbackRatingStep } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import { useState } from "react";
import { FeedbackFormDialog } from "@/components/blocks/feedback-form-dialog";
import { authClient } from "@/lib/auth-client";
import { deckButtonClass, deckLabelClass } from "@/lib/book-deck";
import { BOOK_TONES } from "@/lib/book-tones";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type BookHeaderWriteFeedbackProps = {
	bookSlug: string;
	/** The labelled, tinted button of the book page's action dock. */
	deck?: boolean;
};

export function BookHeaderWriteFeedback({
	bookSlug,
	deck = false,
}: BookHeaderWriteFeedbackProps) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const { data: session, isPending: sessionPending } = authClient.useSession();

	const stateQuery = useQuery({
		...orpc.feedback.getBookFeedbackState.queryOptions({
			input: bookSlug,
		}),
		enabled: Boolean(session?.user),
	});

	if (sessionPending || !session?.user || stateQuery.isPending) {
		return null;
	}

	const myFeedback = stateQuery.data?.myFeedback;
	const canSubmit = stateQuery.data?.canSubmit;

	if (!myFeedback && !canSubmit) {
		return null;
	}

	const isEdit = myFeedback != null;
	const initialValues =
		isEdit && myFeedback != null && isFeedbackRatingStep(myFeedback.rating)
			? {
					rating: myFeedback.rating,
					review: myFeedback.review,
					isSpoiler: myFeedback.isSpoiler,
					visibility: myFeedback.visibility,
					imageUrl: myFeedback.imageUrl ?? null,
				}
			: undefined;

	return (
		<>
			<Button
				type="button"
				size={deck ? "default" : "sm"}
				variant={deck ? "ghost" : "outline"}
				onClick={() => setDialogOpen(true)}
				aria-label={isEdit ? "Edit your feedback" : "Write feedback"}
				className={cn(deck && deckButtonClass)}
			>
				{deck ? (
					<PenLine
						className={cn("size-4", BOOK_TONES.violet.ink)}
						aria-hidden
					/>
				) : null}
				{deck ? (
					<span className={deckLabelClass}>
						{isEdit ? "Your feedback" : "Feedback"}
					</span>
				) : isEdit ? (
					"Edit feedback"
				) : (
					"Write feedback"
				)}
			</Button>
			<FeedbackFormDialog
				bookSlug={bookSlug}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				mode={isEdit ? "edit" : "create"}
				initialValues={initialValues}
				feedbackSlug={myFeedback?.slug}
				navigateToReview={false}
			/>
		</>
	);
}
