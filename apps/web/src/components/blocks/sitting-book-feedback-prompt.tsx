"use client";

import { formatFeedbackRating } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { FeedbackFormDialog } from "@/components/blocks/feedback-form-dialog";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type SittingBookFeedbackPromptProps = {
	bookSlug: string;
	bookTitle: string;
};

export function SittingBookFeedbackPrompt({
	bookSlug,
	bookTitle,
}: SittingBookFeedbackPromptProps) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const { data: session, isPending: sessionPending } = authClient.useSession();

	const stateQuery = useQuery({
		...orpc.feedback.getBookFeedbackState.queryOptions({
			input: bookSlug,
		}),
		enabled: Boolean(session?.user),
	});

	if (sessionPending || (session?.user && stateQuery.isPending)) {
		return (
			<p className="text-muted-foreground text-sm">Loading feedback options…</p>
		);
	}

	if (!session?.user) {
		return (
			<p className="text-muted-foreground text-sm">
				<Link
					href="/sign-in"
					className="font-medium text-foreground underline-offset-4 hover:underline"
				>
					Sign in
				</Link>{" "}
				to leave feedback on {bookTitle}.
			</p>
		);
	}

	const state = stateQuery.data;
	if (!state) {
		return null;
	}

	if (state.myFeedback) {
		const href =
			`/books/${bookSlug}/feedbacks/${state.myFeedback.slug}` as Route;
		return (
			<p className="text-muted-foreground text-sm">
				You reviewed this book ({formatFeedbackRating(state.myFeedback.rating)}{" "}
				/ 5).{" "}
				<Link
					href={href}
					className="font-medium text-foreground underline-offset-4 hover:underline"
				>
					View your review
				</Link>
				.
			</p>
		);
	}

	if (state.canSubmit) {
		return (
			<>
				<p className="text-muted-foreground text-sm">
					Completed {bookTitle}? Share a rating and review with the club.
				</p>
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

	if (state.hint) {
		return <p className="text-muted-foreground text-sm">{state.hint}</p>;
	}

	return null;
}
