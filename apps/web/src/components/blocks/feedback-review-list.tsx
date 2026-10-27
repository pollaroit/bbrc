"use client";

import type { GetBookFeedbackListOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import {
	contentPlainText,
	formatFeedbackRating,
	type ViewSourceName,
} from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { EditionChip } from "@/components/blocks/edition-chip";
import { FeedbackEditIconButton } from "@/components/blocks/feedback-edit-icon-button";
import { FeedbackLikeEngagement } from "@/components/blocks/feedback-like-engagement";
import { RemoveMyMentionMenu } from "@/components/blocks/mention/remove-my-mention";
import { PostAttachedImage } from "@/components/blocks/post-attached-image";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { SocialContentBody } from "@/components/blocks/social-content-body";
import { TrackImpression } from "@/components/blocks/track-impression";
import { UserPanel } from "@/components/blocks/user-panel";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { invalidateFeedbackQueries } from "@/lib/feedback/invalidate-feedback-queries";
import { formatDateTime } from "@/lib/format-datetime";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { isPendingSlug } from "@/lib/optimistic/infinite-lists";
import { shareSnippet } from "@/lib/share-snippet";
import { orpc } from "@/utils/orpc";

export type FeedbackReviewListItem = GetBookFeedbackListOutput[number];

type FeedbackReviewListProps = {
	bookSlug: string;
	reviews: FeedbackReviewListItem[];
	emptyMessage: string;
	/** Where the list is shown, for view counts. */
	impressionSource?: ViewSourceName;
};

export function FeedbackReviewList({
	bookSlug,
	reviews,
	emptyMessage,
	impressionSource = "book_reviews",
}: FeedbackReviewListProps) {
	const t = useTranslations("books");
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const [deleteOpen, setDeleteOpen] = useState(false);

	const deleteMutation = useMutation(
		orpc.feedback.delete.mutationOptions({
			onSuccess: async () => {
				setDeleteOpen(false);
				toast.success(t("feedback.deleted"));
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
						<li
							key={entry.slug}
							className={
								isPendingSlug(entry.slug)
									? "relative select-none opacity-60 *:pointer-events-none"
									: undefined
							}
							aria-busy={isPendingSlug(entry.slug) || undefined}
						>
							{isPendingSlug(entry.slug) ? (
								<span className="absolute top-3 right-3 z-10 text-muted-foreground text-xs">
									{t("feedback.posting")}
								</span>
							) : null}
							<TrackImpression
								resource="review"
								itemRef={isPendingSlug(entry.slug) ? "" : entry.slug}
								source={impressionSource}
							>
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
										<div className="relative">
											<Link
												href={feedbackHref}
												className="absolute inset-0 z-0"
												aria-label={t("feedback.openBy", { name: entry.name })}
											/>
											<div className="pointer-events-none relative z-[1] [&_*]:pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
												{contentPlainText(entry.review).trim().length > 0 ? (
													<SocialContentBody
														content={entry.review}
														isSpoiler={entry.isSpoiler}
														kind="feedback"
														identifier={entry.slug}
														interactiveLinks
													/>
												) : (
													<p className="text-muted-foreground text-sm italic">
														{t("feedback.ratingOnly")}
													</p>
												)}
											</div>
										</div>
										{entry.imageUrl ? (
											<Link href={feedbackHref} className="block">
												<PostAttachedImage
													src={entry.imageUrl}
													alt=""
													compact
													className="mt-0"
												/>
											</Link>
										) : null}
										<EditionChip
											bookSlug={bookSlug}
											edition={entry.readEdition}
											className="self-start"
										/>
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
												label={t("feedback.shareReview")}
												shareInPost={{ kind: "feedback", slug: entry.slug }}
											/>
											<RemoveMyMentionMenu kind="review" slug={entry.slug} />
											{isOwner ? (
												<>
													<FeedbackEditIconButton
														bookSlug={bookSlug}
														rating={entry.rating}
														review={entry.review}
														isSpoiler={entry.isSpoiler}
														imageUrl={entry.imageUrl}
														feedbackSlug={entry.slug}
													/>
													<LoadingButton
														type="button"
														variant="ghost"
														size="sm"
														className="h-8 px-2 text-destructive hover:text-destructive"
														loading={deleteMutation.isPending}
														onClick={() => setDeleteOpen(true)}
													>
														{t("feedback.delete")}
													</LoadingButton>
												</>
											) : null}
										</div>
									</CardContent>
								</Card>
							</TrackImpression>
						</li>
					);
				})}
			</ul>
			<DestructiveConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={t("feedback.deleteTitle")}
				description={t("feedback.deleteDescription")}
				confirmLabel={t("feedback.deleteConfirm")}
				loading={deleteMutation.isPending}
				onConfirm={() => deleteMutation.mutate(bookSlug)}
			/>
		</>
	);
}
