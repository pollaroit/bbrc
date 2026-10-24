import type { Metadata } from "next";
import { ShelvesList } from "@/components/blocks/shelves-list";
import { ShelvesPageHeader } from "@/components/blocks/shelves-page-header";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Shelves",
	description:
		"Browse reading lists from BBRC members: ranked picks, themed collections, and shelves built together.",
	path: "/shelves",
});

export const dynamic = "force-static";

export default function ShelvesPage() {
	return (
		<ListingSearchParamsBoundary>
			<div className="flex flex-col gap-8">
				<ShelvesPageHeader />
				<ShelvesList />
			</div>
		</ListingSearchParamsBoundary>
	);
}
