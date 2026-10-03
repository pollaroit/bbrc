import type { Metadata } from "next";
import { ShelvesList } from "@/components/blocks/shelves-list";
import { ShelvesListingToolbar } from "@/components/blocks/shelves-listing-toolbar";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Shelves",
	description:
		"Browse public reading lists from BBRC members — ranked picks, themed collections, and more.",
	path: "/shelves",
});

export const dynamic = "force-static";

export default function ShelvesPage() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="font-bold text-2xl">Shelves</h1>
				<p className="max-w-2xl text-muted-foreground text-sm">
					Public reading lists curated by club members. Search by title or
					creator, filter by type or size, and sort by recency or book count.
				</p>
			</div>
			<ListingSearchParamsBoundary>
				<ShelvesListingToolbar />
				<ShelvesList />
			</ListingSearchParamsBoundary>
		</div>
	);
}
