"use client";

import { isFeedbackRatingStep } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FeedbackFormDialog } from "@/components/blocks/feedback-form-dialog";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type BookHeaderWriteFeedbackProps = {
	bookSlug: string;
};

export function BookHeaderWriteFeedback({
	bookSlug,
}: BookHeaderWriteFeedbackProps) {
	const t = useTranslations("books");
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
					imageUrl: myFeedback.imageUrl ?? null,
				}
			: undefined;

	return (
		<>
			<Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
				{isEdit ? t("actions.editFeedback") : t("actions.writeFeedback")}
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
