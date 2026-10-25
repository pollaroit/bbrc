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
}: PageProps<"/posts/[slug]/insights">): Promise<Metadata> {
	const { slug } = await params;
	const ref = slug;
	const target = await loadInsightsTarget("post", ref);
	if (!target) {
		return buildNotFoundMetadata("Post");
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
}: PageProps<"/posts/[slug]/insights">) {
	const { slug } = await params;
	const ref = slug;
	const target = await requireInsightsAccess("post", ref);

	return (
		<InsightsPageFrame
			resource="post"
			reference={ref}
			title={target.title}
			href={target.href}
		/>
	);
}
