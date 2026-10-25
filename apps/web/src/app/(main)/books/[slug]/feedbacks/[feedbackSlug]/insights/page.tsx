import type { Metadata } from "next";
import { InsightsPageFrame } from "@/components/blocks/view-insights/insights-page-frame";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";
import {
	loadInsightsTarget,
	requireInsightsAccess,
} from "@/lib/view-insights-gate";

/** Session-gated (`headers()`); never cached or prerendered. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/books/[slug]/feedbacks/[feedbackSlug]/insights">): Promise<Metadata> {
	const { feedbackSlug } = await params;
	const ref = feedbackSlug;
	const target = await loadInsightsTarget("review", ref);
	if (!target) {
		return buildNotFoundMetadata("Review");
	}
	return buildPageMetadata({
		title: `Insights · ${target.title}`,
		description: "Who looks, and when.",
		path: target.insightsHref,
		robots: NO_INDEX_ROBOTS,
	});
}

export default async function InsightsPage({
	params,
}: PageProps<"/books/[slug]/feedbacks/[feedbackSlug]/insights">) {
	const { feedbackSlug } = await params;
	const ref = feedbackSlug;
	const target = await requireInsightsAccess("review", ref);

	return (
		<InsightsPageFrame
			resource="review"
			reference={ref}
			title={target.title}
			href={target.href}
		/>
	);
}
