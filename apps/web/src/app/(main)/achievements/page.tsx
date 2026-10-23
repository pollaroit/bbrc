import type { Metadata } from "next";
import { AchievementsCatalog } from "@/components/blocks/achievements-catalog";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Achievements",
	description:
		"Badges you can earn at BBRC for reading, sittings, reviews and more. See what is left to unlock.",
	path: "/achievements",
});

export const dynamic = "force-static";

export default function AchievementsPage() {
	return (
		<ListingSearchParamsBoundary>
			<AchievementsCatalog />
		</ListingSearchParamsBoundary>
	);
}
