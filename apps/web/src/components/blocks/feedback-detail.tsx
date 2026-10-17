import type { GetFeedbackBySlugOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import { contentPlainText } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent, CardHeader } from "@bbrc/ui/components/card";
import { ArrowLeft, MessageCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { FeedbackCommentFocusSection } from "@/components/blocks/feedback-comment-focus-section";
import { FeedbackCommentsSection } from "@/components/blocks/feedback-comments-section";
import { FeedbackDetailOwnerActions } from "@/components/blocks/feedback-detail-owner-actions";
import { FeedbackLikeEngagement } from "@/components/blocks/feedback-like-engagement";
import { RelativeTime } from "@/components/blocks/relative-time";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { SocialContentBody } from "@/components/blocks/social-content-body";
import { UserPanel } from "@/components/blocks/user-panel";
import { shareSnippet } from "@/lib/share-snippet";

type FeedbackDetailProps = {
	feedback: GetFeedbackBySlugOutput;
	/** When set, show this comment thread instead of the full comments section. */
	commentFocusSlug?: string | null;
	showCommentsSection?: boolean;
};

export function FeedbackDetail({
	feedback,
	commentFocusSlug = null,
	showCommentsSection = true,
}: FeedbackDetailProps) {
	const bookHref = `/books/${feedback.bookSlug}` as Route;
	const feedbackHref =
		`/books/${feedback.bookSlug}/feedbacks/${feedback.slug}` as Route;
	const commentsHref =
		`/books/${feedback.bookSlug}/feedbacks/${feedback.slug}#comments` as Route;
	const profileHref = `/users/${feedback.author.username}` as Route;
	const sittingHref = feedback.sittingSlug
		? (`/sittings/${feedback.sittingSlug}` as Route)
		: null;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<Link
				href={bookHref}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				{feedback.bookTitle}
			</Link>

			<Card size="sm" className="overflow-hidden">
				<CardHeader className="flex flex-row items-start justify-between gap-3 border-b">
					<Link href={profileHref} className="min-w-0 outline-offset-2">
						<UserPanel user={feedback.author} className="min-w-0 items-start" />
					</Link>
					<div className="flex shrink-0 flex-col items-end gap-1 text-right">
						<Badge variant="outline" className="tabular-nums">
							{feedback.rating.toFixed(1)} / 5
						</Badge>
						<p className="text-muted-foreground text-xs">
							<RelativeTime date={feedback.createdAt} />
						</p>
						{sittingHref ? (
							<Link
								href={sittingHref}
								className="text-muted-foreground text-xs hover:text-foreground hover:underline"
							>
								View sitting
							</Link>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4 pt-4">
					{contentPlainText(feedback.review).trim().length > 0 ? (
						<SocialContentBody
							content={feedback.review}
							isSpoiler={feedback.isSpoiler}
							kind="feedback"
							identifier={feedback.slug}
							interactiveLinks
						/>
					) : (
						<p className="text-muted-foreground text-sm italic">
							Rating only — no written review.
						</p>
					)}
					<div className="flex flex-wrap items-center gap-4 border-t pt-4 text-muted-foreground text-sm">
						<FeedbackDetailOwnerActions
							bookSlug={feedback.bookSlug}
							authorUsername={feedback.author.username}
							rating={feedback.rating}
							review={feedback.review}
							isSpoiler={feedback.isSpoiler}
						/>
						<FeedbackLikeEngagement
							feedbackSlug={feedback.slug}
							initialLikeCount={feedback.likeCount}
							initialLikedByMe={feedback.likedByMe}
						/>
						<Link
							href={commentsHref}
							className="inline-flex items-center gap-1.5 tabular-nums transition-colors hover:text-foreground"
						>
							<MessageCircle className="size-4" aria-hidden />
							{feedback.commentCount}
						</Link>
						<ResourceShareMenu
							path={`/books/${feedback.bookSlug}/feedbacks/${feedback.slug}`}
							shareText={`${feedback.bookTitle} · ${shareSnippet(feedback.review)}`}
							label="Share review"
							shareInPost={{ kind: "feedback", slug: feedback.slug }}
							size="md"
						/>
					</div>
				</CardContent>
			</Card>

			{commentFocusSlug ? (
				<>
					<FeedbackCommentFocusSection
						feedbackSlug={feedback.slug}
						bookSlug={feedback.bookSlug}
						focusCommentSlug={commentFocusSlug}
					/>
					<Button
						variant="outline"
						className="w-fit"
						render={<Link href={feedbackHref} />}
						nativeButton={false}
					>
						View all comments on this review
					</Button>
				</>
			) : showCommentsSection ? (
				<FeedbackCommentsSection
					feedbackSlug={feedback.slug}
					bookSlug={feedback.bookSlug}
				/>
			) : null}

			<Button
				variant="outline"
				className="w-fit"
				render={<Link href={bookHref} />}
				nativeButton={false}
			>
				View all reviews on {feedback.bookTitle}
			</Button>
		</div>
	);
}
