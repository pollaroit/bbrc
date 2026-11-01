import { getFeedbackBySlug } from "@bbrc/api/modules/feedback/feedback.service";
import { peekFeedback } from "@bbrc/api/modules/visibility/peek";
import { ANONYMOUS_VIEWER } from "@bbrc/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedbackDetail } from "@/components/blocks/feedback-detail";
import { LockedItem } from "@/components/blocks/locked-item";
import { TrackDetailView } from "@/components/blocks/track-detail-view";
import { getRequestViewer } from "@/lib/request-viewer";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
	truncateDescription,
} from "@/lib/seo";
import { truncateOgTitle } from "@/lib/seo/og/helpers";
import { db } from "@/services";

export const dynamic = "force-dynamic";

/** Cached pages are built for an anonymous visitor. */
const anonymousSession = ANONYMOUS_VIEWER;

export async function generateMetadata({
	params,
}: PageProps<"/books/[slug]/feedbacks/[feedbackSlug]">): Promise<Metadata> {
	const { slug, feedbackSlug } = await params;

	try {
		const feedback = await getFeedbackBySlug(
			feedbackSlug,
			db,
			anonymousSession,
		);
		if (feedback.bookSlug !== slug) {
			return buildNotFoundMetadata("Review");
		}

		return buildPageMetadata({
			title: truncateOgTitle(feedback.review),
			description: truncateDescription(
				`${feedback.bookTitle} · ${feedback.rating.toFixed(1)} / 5 · ${feedback.author.name}`,
			),
			path: `/books/${slug}/feedbacks/${feedbackSlug}`,
			openGraph: { type: "article" },
		});
	} catch {
		const peek = await peekFeedback(db, ANONYMOUS_VIEWER, feedbackSlug).catch(
			() => null,
		);
		if (peek?.state === "locked") {
			return buildPageMetadata({
				title: `Friends-only review by ${peek.author.name}`,
				description: `Only ${peek.author.name}'s friends can open this review.`,
				path: `/books/${slug}/feedbacks/${feedbackSlug}`,
				robots: NO_INDEX_ROBOTS,
			});
		}
		return buildNotFoundMetadata("Review");
	}
}

export default async function BookFeedbackPage({
	params,
}: PageProps<"/books/[slug]/feedbacks/[feedbackSlug]">) {
	const { slug, feedbackSlug } = await params;

	try {
		// The page is never cached, so it knows who is looking.
		const feedback = await getFeedbackBySlug(
			feedbackSlug,
			db,
			await getRequestViewer(),
		);
		if (feedback.bookSlug !== slug) {
			notFound();
		}

		return (
			<>
				<TrackDetailView resource="review" itemRef={feedback.slug} />
				<FeedbackDetail feedback={feedback} />
			</>
		);
	} catch {
		const peek = await peekFeedback(
			db,
			await getRequestViewer(),
			feedbackSlug,
		).catch(() => null);
		if (peek?.state === "locked") {
			return <LockedItem kind="review" author={peek.author} />;
		}
		notFound();
	}
}
