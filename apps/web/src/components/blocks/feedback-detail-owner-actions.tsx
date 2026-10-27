"use client";

import type { GetFeedbackBySlugOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { LineChart } from "lucide-react";
import type { Route } from "next";
import { FeedbackEditIconButton } from "@/components/blocks/feedback-edit-icon-button";
import { useLiveFeedback } from "@/components/blocks/feedback-live";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

type FeedbackDetailOwnerActionsProps = {
	feedback: GetFeedbackBySlugOutput;
};

/** Edit and Insights for the author; Insights alone for admins. */
export function FeedbackDetailOwnerActions({
	feedback,
}: FeedbackDetailOwnerActionsProps) {
	const { data: session } = authClient.useSession();
	const live = useLiveFeedback(feedback);

	if (!session?.user) {
		return null;
	}
	const isAuthor = session.user.username === feedback.author.username;
	if (!isAuthor && session.user.isAdmin !== true) {
		return null;
	}

	return (
		<>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="size-8 shrink-0 text-muted-foreground"
							nativeButton={false}
							render={
								<Link
									href={
										`/books/${feedback.bookSlug}/feedbacks/${feedback.slug}/insights` as Route
									}
									aria-label="Review insights"
								/>
							}
						/>
					}
				>
					<LineChart className="size-4" aria-hidden />
				</TooltipTrigger>
				<TooltipContent>Insights</TooltipContent>
			</Tooltip>
			{isAuthor ? (
				<FeedbackEditIconButton
					bookSlug={feedback.bookSlug}
					rating={live.rating}
					review={live.review}
					isSpoiler={live.isSpoiler}
					imageUrl={feedback.imageUrl}
					feedbackSlug={feedback.slug}
				/>
			) : null}
		</>
	);
}
