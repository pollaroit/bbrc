import type { Metadata } from "next";
import { PeopleList } from "@/components/blocks/people-list";
import { PeoplePageHeader } from "@/components/blocks/people-page-header";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "People",
	description:
		"Everyone in the BBRC club: search, filter and sort members by level, reads, streaks and more.",
	path: "/users",
});

export const dynamic = "force-static";

export default function PeoplePage() {
	return (
		<ListingSearchParamsBoundary>
			<div className="flex flex-col gap-8">
				<PeoplePageHeader />
				<PeopleList />
			</div>
		</ListingSearchParamsBoundary>
	);
}
