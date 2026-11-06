import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { ClubStatsPage } from "@/components/stats/club/club-stats-page";
import { authPageHref } from "@/lib/auth-callback-url";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
	title: "Club stats",
	description:
		"The whole club in numbers: books, pages, authors, countries and more.",
	path: "/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function ClubStatsRoute() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user) {
		redirect(authPageHref("/sign-in", "/stats") as Route);
	}
	return (
		<ListingSearchParamsBoundary>
			<ClubStatsPage />
		</ListingSearchParamsBoundary>
	);
}
