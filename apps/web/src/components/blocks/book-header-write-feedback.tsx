"use client";

import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
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

	if (!stateQuery.data?.canSubmit) {
		return null;
	}

	return (
		<>
			<Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
				Write feedback
			</Button>
			<FeedbackFormDialog
				bookSlug={bookSlug}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				navigateToReview={false}
			/>
		</>
	);
}
