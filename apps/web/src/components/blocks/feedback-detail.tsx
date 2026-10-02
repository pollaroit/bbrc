import type { GetFeedbackBySlugOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent, CardHeader } from "@bbrc/ui/components/card";
import { ArrowLeft, MessageCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { FeedbackCommentsSection } from "@/components/blocks/feedback-comments-section";
import { FeedbackCopyLinkButton } from "@/components/blocks/feedback-copy-link-button";
import { FeedbackLikeEngagement } from "@/components/blocks/feedback-like-engagement";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserPanel } from "@/components/blocks/user-panel";

type FeedbackDetailProps = {
	feedback: GetFeedbackBySlugOutput;
};

export function FeedbackDetail({ feedback }: FeedbackDetailProps) {
	const bookHref = `/books/${feedback.bookSlug}` as Route;
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
					<p className="whitespace-pre-wrap text-sm leading-relaxed">
						{feedback.review}
					</p>
					<div className="flex flex-wrap items-center gap-4 border-t pt-4 text-muted-foreground text-sm">
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
						<FeedbackCopyLinkButton
							bookSlug={feedback.bookSlug}
							feedbackSlug={feedback.slug}
						/>
					</div>
				</CardContent>
			</Card>

			<FeedbackCommentsSection
				feedbackSlug={feedback.slug}
				bookSlug={feedback.bookSlug}
			/>

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
