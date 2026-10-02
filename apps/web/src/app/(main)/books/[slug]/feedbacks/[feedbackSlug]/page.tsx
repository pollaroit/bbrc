import { getFeedbackBySlug } from "@bbrc/api/modules/feedback/feedback.service";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedbackDetail } from "@/components/blocks/feedback-detail";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	truncateDescription,
} from "@/lib/seo";
import { db } from "@/services";

export const dynamic = "force-dynamic";

const anonymousSession = null;

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
			title: `Review by ${feedback.author.name}`,
			description:
				truncateDescription(feedback.review) ||
				`Club review of ${feedback.bookTitle} on BBRC.`,
			path: `/books/${slug}/feedbacks/${feedbackSlug}`,
			openGraph: { type: "article" },
		});
	} catch {
		return buildNotFoundMetadata("Review");
	}
}

export default async function BookFeedbackPage({
	params,
}: PageProps<"/books/[slug]/feedbacks/[feedbackSlug]">) {
	const { slug, feedbackSlug } = await params;

	try {
		const feedback = await getFeedbackBySlug(
			feedbackSlug,
			db,
			anonymousSession,
		);
		if (feedback.bookSlug !== slug) {
			notFound();
		}

		return <FeedbackDetail feedback={feedback} />;
	} catch {
		notFound();
	}
}
