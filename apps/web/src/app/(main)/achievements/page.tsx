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
		<div className="flex flex-col gap-8">
			<section className="flex flex-col gap-2 border border-border bg-card px-4 py-6 sm:px-6">
				<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
					Achievements
				</h1>
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					Badges for what you read, finish and share. Most have several tiers,
					and a few are hidden until you find them. Pin your favorites to your
					profile.
				</p>
			</section>
			<ListingSearchParamsBoundary>
				<AchievementsCatalog />
			</ListingSearchParamsBoundary>
		</div>
	);
}
