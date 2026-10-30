import { getCommentBySlug } from "@bbrc/api/modules/comment/comment.service";
import { getFeedbackBySlug } from "@bbrc/api/modules/feedback/feedback.service";
import { ANONYMOUS_VIEWER } from "@bbrc/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedbackDetail } from "@/components/blocks/feedback-detail";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	truncateDescription,
} from "@/lib/seo";
import { truncateOgTitle } from "@/lib/seo/og/helpers";
import { db } from "@/services";

/** On-demand only — too many comments for static generation or sitemap. */
export const dynamic = "force-dynamic";

/** Cached pages are built for an anonymous visitor. */
const anonymousSession = ANONYMOUS_VIEWER;

export async function generateMetadata({
	params,
}: PageProps<"/books/[slug]/feedbacks/[feedbackSlug]/comments/[commentSlug]">): Promise<Metadata> {
	const { slug, feedbackSlug, commentSlug } = await params;

	try {
		const [comment, feedback] = await Promise.all([
			getCommentBySlug(commentSlug, db, anonymousSession),
			getFeedbackBySlug(feedbackSlug, db, anonymousSession),
		]);

		if (
			comment.bookSlug !== slug ||
			comment.feedbackSlug !== feedbackSlug ||
			feedback.bookSlug !== slug
		) {
			return buildNotFoundMetadata("Comment");
		}

		return buildPageMetadata({
			title: truncateOgTitle(comment.content),
			description: truncateDescription(
				`${feedback.bookTitle} · review by ${feedback.author.name}`,
			),
			path: `/books/${slug}/feedbacks/${feedbackSlug}/comments/${commentSlug}`,
			openGraph: { type: "article" },
		});
	} catch {
		return buildNotFoundMetadata("Comment");
	}
}

export default async function FeedbackCommentPage({
	params,
}: PageProps<"/books/[slug]/feedbacks/[feedbackSlug]/comments/[commentSlug]">) {
	const { slug, feedbackSlug, commentSlug } = await params;

	let feedback: Awaited<ReturnType<typeof getFeedbackBySlug>>;
	let comment: Awaited<ReturnType<typeof getCommentBySlug>>;

	try {
		[feedback, comment] = await Promise.all([
			getFeedbackBySlug(feedbackSlug, db, anonymousSession),
			getCommentBySlug(commentSlug, db, anonymousSession),
		]);
	} catch {
		notFound();
	}

	if (
		feedback.bookSlug !== slug ||
		comment.bookSlug !== slug ||
		comment.feedbackSlug !== feedbackSlug
	) {
		notFound();
	}

	return (
		<FeedbackDetail
			feedback={feedback}
			commentFocusSlug={commentSlug}
			showCommentsSection={false}
		/>
	);
}
