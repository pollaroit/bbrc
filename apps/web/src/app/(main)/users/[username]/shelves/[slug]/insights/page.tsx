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
}: PageProps<"/users/[username]/shelves/[slug]/insights">): Promise<Metadata> {
	const { username, slug } = await params;
	const ref = `${username}/${slug}`;
	const target = await loadInsightsTarget("shelf", ref);
	if (!target) {
		return buildNotFoundMetadata("Shelf");
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
}: PageProps<"/users/[username]/shelves/[slug]/insights">) {
	const { username, slug } = await params;
	const ref = `${username}/${slug}`;
	const target = await requireInsightsAccess("shelf", ref);

	return (
		<InsightsPageFrame
			resource="shelf"
			reference={ref}
			title={target.title}
			href={target.href}
		/>
	);
}
