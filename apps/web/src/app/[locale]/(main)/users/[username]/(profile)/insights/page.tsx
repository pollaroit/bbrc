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
}: PageProps<"/[locale]/users/[username]/insights">): Promise<Metadata> {
	const { username } = await params;
	const ref = username;
	const target = await loadInsightsTarget("user", ref);
	if (!target) {
		return buildNotFoundMetadata("Member");
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
}: PageProps<"/[locale]/users/[username]/insights">) {
	const { username } = await params;
	const ref = username;
	const target = await requireInsightsAccess("user", ref);

	return (
		<InsightsPageFrame
			resource="user"
			reference={ref}
			title={target.title}
			href={target.href}
		/>
	);
}
