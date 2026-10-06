"use client";

import type { GetBookFeedbackListOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import { formatFeedbackRating } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FeedbackLikeEngagement } from "@/components/blocks/feedback-like-engagement";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { UserPanel } from "@/components/blocks/user-panel";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { invalidateFeedbackQueries } from "@/lib/feedback/invalidate-feedback-queries";
import { formatDateTime } from "@/lib/format-datetime";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { shareSnippet } from "@/lib/share-snippet";
import { orpc } from "@/utils/orpc";

export type FeedbackReviewListItem = GetBookFeedbackListOutput[number];

type FeedbackReviewListProps = {
	bookSlug: string;
	reviews: FeedbackReviewListItem[];
	emptyMessage: string;
};

export function FeedbackReviewList({
	bookSlug,
	reviews,
	emptyMessage,
}: FeedbackReviewListProps) {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const [deleteOpen, setDeleteOpen] = useState(false);

	const deleteMutation = useMutation(
		orpc.feedback.delete.mutationOptions({
			onSuccess: async () => {
				setDeleteOpen(false);
				toast.success("Feedback deleted.");
				await invalidateFeedbackQueries();
				if (session?.user.username) {
					await invalidateUserPointQueries();
				}
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (reviews.length === 0) {
		return (
			<Card size="sm">
				<CardContent className="text-muted-foreground text-sm">
					{emptyMessage}
				</CardContent>
			</Card>
		);
	}

	const currentUserId = session?.user.id;

	return (
		<>
			<ul className="flex flex-col gap-3">
				{reviews.map((entry) => {
					const feedbackHref =
						`/books/${bookSlug}/feedbacks/${entry.slug}` as Route;
					const commentsHref =
						`/books/${bookSlug}/feedbacks/${entry.slug}#comments` as Route;
					const isOwner = currentUserId === entry.authorId;

					return (
						<li key={entry.slug}>
							<Card size="sm">
								<CardContent className="flex flex-col gap-3">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<Link
											href={feedbackHref}
											className="min-w-0 outline-offset-2"
										>
											<UserPanel user={entry} />
										</Link>
										<div className="flex flex-col items-end gap-1 text-right">
											<Badge variant="outline" className="tabular-nums">
												{formatFeedbackRating(entry.rating)} / 5
											</Badge>
											<p className="text-muted-foreground text-xs">
												{formatDateTime(entry.createdAt)}
											</p>
										</div>
									</div>
									<Link
										href={feedbackHref}
										className="text-sm leading-relaxed transition-colors hover:text-foreground/90"
									>
										{entry.review}
									</Link>
									<div className="flex flex-wrap items-center gap-4 border-t pt-3 text-muted-foreground text-sm">
										<FeedbackLikeEngagement
											feedbackSlug={entry.slug}
											initialLikeCount={entry.likeCount}
											initialLikedByMe={entry.likedByMe}
										/>
										<Link
											href={commentsHref}
											className="inline-flex items-center gap-1.5 tabular-nums transition-colors hover:text-foreground"
										>
											<MessageCircle className="size-4" aria-hidden />
											{entry.commentCount}
										</Link>
										<ResourceShareMenu
											path={`/books/${bookSlug}/feedbacks/${entry.slug}`}
											shareText={shareSnippet(entry.review)}
											label="Share review"
											shareInPost={{ kind: "feedback", slug: entry.slug }}
										/>
										{isOwner ? (
											<LoadingButton
												type="button"
												variant="ghost"
												size="sm"
												className="h-8 px-2 text-destructive hover:text-destructive"
												loading={deleteMutation.isPending}
												onClick={() => setDeleteOpen(true)}
											>
												Delete
											</LoadingButton>
										) : null}
									</div>
								</CardContent>
							</Card>
						</li>
					);
				})}
			</ul>
			<DestructiveConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title="Delete feedback?"
				description="Your review will be removed from this book’s club reviews. This cannot be undone."
				confirmLabel="Delete feedback"
				loading={deleteMutation.isPending}
				onConfirm={() => deleteMutation.mutate(bookSlug)}
			/>
		</>
	);
}
