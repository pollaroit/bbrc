import { ACHIEVEMENTS, describeTier } from "@bbrc/shared";
import type { Metadata } from "next";
import { AchievementDetail } from "@/components/blocks/achievement-detail";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/achievements/[slug]">): Promise<Metadata> {
	const { slug } = await params;
	const definition = ACHIEVEMENTS.find((item) => item.slug === slug);

	if (!definition) {
		return buildNotFoundMetadata("Achievement");
	}
	// Hidden achievements stay secret until earned, so they get a generic page.
	if (definition.isHidden) {
		return buildPageMetadata({
			title: "Hidden achievement",
			description: "A hidden BBRC achievement. Earn it to find out more.",
			path: `/achievements/${slug}`,
			robots: NO_INDEX_ROBOTS,
		});
	}

	return buildPageMetadata({
		title: `${definition.name} · Achievements`,
		description: describeTier(definition, 1),
		path: `/achievements/${slug}`,
	});
}

export default async function AchievementPage({
	params,
}: PageProps<"/achievements/[slug]">) {
	const { slug } = await params;

	return <AchievementDetail slug={slug} />;
}
